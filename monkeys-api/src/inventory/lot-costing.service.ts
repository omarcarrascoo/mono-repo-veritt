import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma/prisma.service';
import {
  CostQuote,
  OpenLot,
  fifoFloorUnitCost,
  filterByLocation,
  quoteFifoConsumption,
  totalRemaining,
  totalValueAtCost,
  weightedAverage,
} from './lot-costing.helpers';

type Tx = Prisma.TransactionClient | PrismaService;

const round4 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(4));
};

const toNumber = (
  value: Prisma.Decimal | number | string | null | undefined,
): number => {
  if (value === null || value === undefined) return 0;
  return Number(value);
};

// ── Tipos publicos ───────────────────────────────────────────────────

export interface MaterialInventoryValue {
  materialId: string;
  totalQuantity: number;
  totalValueAtCost: number;
  byLot: Array<{
    lotId: string;
    locationId: string;
    remaining: number;
    unitCost: number;
    subtotal: number;
    receivedAt: string;
  }>;
}

export interface RealConsumptionCost {
  /** Suma de quantity de todas las allocations del rango. */
  totalQuantity: number;
  /** Suma de totalCostSnapshot de todas las allocations del rango. */
  totalCost: number;
  /** Costo unitario promedio ponderado. 0 si no hubo allocations. */
  weightedUnitCost: number;
}

export interface InventoryDriftRow {
  materialId: string;
  materialName: string;
  locationId: string;
  locationName: string;
  cachedStock: number;
  lotsRemaining: number;
  movementsBalance: number;
  lotsVsCacheDelta: number;
  movementsVsCacheDelta: number;
}

// ── Servicio ─────────────────────────────────────────────────────────

@Injectable()
export class LotCostingService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Lectores DB → OpenLot ──────────────────────────────────────────

  /**
   * Lee los lotes del material que tienen `remainingQuantity > 0`. Si se
   * pasa `locationId`, filtra a esa ubicacion. Los lotes vienen en su
   * forma `OpenLot` lista para usar con los helpers puros.
   */
  async getOpenLots(
    materialId: string,
    locationId?: string,
    tx: Tx = this.prisma,
  ): Promise<OpenLot[]> {
    const lots = await tx.materialLot.findMany({
      where: {
        materialId,
        ...(locationId ? { locationId } : {}),
        remainingQuantity: { gt: 0 },
      },
      select: {
        id: true,
        remainingQuantity: true,
        unitCost: true,
        receivedAt: true,
        locationId: true,
      },
    });

    return lots.map((lot) => ({
      id: lot.id,
      remainingQuantity: toNumber(lot.remainingQuantity),
      unitCost: toNumber(lot.unitCost),
      receivedAt: lot.receivedAt,
      locationId: lot.locationId,
    }));
  }

  // ── Pregunta C — promedio agregado para reportes y recetas ─────────

  /**
   * Cache leido de Material.currentReferenceUnitCost. Recalculable con
   * `refreshReferenceCost`.
   */
  async getReferenceUnitCost(
    materialId: string,
    tx: Tx = this.prisma,
  ): Promise<number> {
    const mat = await tx.material.findUnique({
      where: { id: materialId },
      select: { currentReferenceUnitCost: true },
    });
    return toNumber(mat?.currentReferenceUnitCost);
  }

  /**
   * Calcula promedio ponderado en el momento — sin tocar cache.
   * Util cuando se necesita un valor preciso al instante (e.g. dentro
   * de una transaccion donde el cache aun no se refresco).
   */
  async computeWeightedAverage(
    materialId: string,
    tx: Tx = this.prisma,
  ): Promise<number> {
    const lots = await this.getOpenLots(materialId, undefined, tx);
    return weightedAverage(lots);
  }

  // ── Pregunta B — costo del consumo proximo ─────────────────────────

  /**
   * Costo del lote abierto mas antiguo (FIFO floor) en una ubicacion.
   * Si no hay lotes activos, fallback al promedio agregado del material.
   */
  async getFifoFloor(
    materialId: string,
    locationId: string,
    tx: Tx = this.prisma,
  ): Promise<number> {
    const lots = await this.getOpenLots(materialId, locationId, tx);
    const floor = fifoFloorUnitCost(lots);
    if (floor !== null) return floor;
    // Fallback al cache cuando la ubicacion esta vacia.
    return this.getReferenceUnitCost(materialId, tx);
  }

  /**
   * Simula consumir `qty` en FIFO. No muta. El caller decide si bloquea
   * por shortfall o tolera (UI cotizacion previa).
   */
  async quoteConsumption(
    materialId: string,
    qty: number,
    locationId: string,
    tx: Tx = this.prisma,
  ): Promise<CostQuote> {
    const lots = await this.getOpenLots(materialId, locationId, tx);
    return quoteFifoConsumption(lots, qty);
  }

  // ── Pregunta A — valor del inventario ──────────────────────────────

  /**
   * Suma `MaterialLot.remainingQuantity * MaterialLot.unitCost` por todos
   * los lotes activos del material. Para el AMD P2 y reportes admin.
   */
  async getMaterialInventoryValue(
    materialId: string,
    tx: Tx = this.prisma,
  ): Promise<MaterialInventoryValue> {
    const lots = await tx.materialLot.findMany({
      where: { materialId, remainingQuantity: { gt: 0 } },
      select: {
        id: true,
        locationId: true,
        remainingQuantity: true,
        unitCost: true,
        receivedAt: true,
      },
      orderBy: { receivedAt: 'asc' },
    });

    const byLot = lots.map((l) => {
      const remaining = toNumber(l.remainingQuantity);
      const unitCost = toNumber(l.unitCost);
      return {
        lotId: l.id,
        locationId: l.locationId,
        remaining: round4(remaining),
        unitCost: round4(unitCost),
        subtotal: round4(remaining * unitCost),
        receivedAt: l.receivedAt.toISOString(),
      };
    });

    return {
      materialId,
      totalQuantity: round4(byLot.reduce((s, l) => s + l.remaining, 0)),
      totalValueAtCost: round4(byLot.reduce((s, l) => s + l.subtotal, 0)),
      byLot,
    };
  }

  /**
   * Snapshot de valor inventariado por todos los materiales activos del
   * negocio. Es lo que la P2 del AMD guarda en contentJson como
   * balanceSheet.assets.inventoryAtCost + detalle.
   */
  async getBusinessInventoryValue(
    businessId: string,
    tx: Tx = this.prisma,
  ): Promise<{
    materials: Array<{
      materialId: string;
      name: string;
      baseUnit: string;
      totalQuantity: number;
      totalValueAtCost: number;
    }>;
    totalValueAtCost: number;
  }> {
    const lots = await tx.materialLot.findMany({
      where: {
        businessId,
        remainingQuantity: { gt: 0 },
        material: { status: 'ACTIVE' },
      },
      select: {
        materialId: true,
        remainingQuantity: true,
        unitCost: true,
        material: { select: { name: true, baseUnit: true } },
      },
    });

    const byMaterial = new Map<
      string,
      {
        materialId: string;
        name: string;
        baseUnit: string;
        totalQuantity: number;
        totalValueAtCost: number;
      }
    >();

    for (const lot of lots) {
      const qty = toNumber(lot.remainingQuantity);
      const cost = toNumber(lot.unitCost);
      const existing = byMaterial.get(lot.materialId);
      if (existing) {
        existing.totalQuantity += qty;
        existing.totalValueAtCost += qty * cost;
      } else {
        byMaterial.set(lot.materialId, {
          materialId: lot.materialId,
          name: lot.material.name,
          baseUnit: lot.material.baseUnit,
          totalQuantity: qty,
          totalValueAtCost: qty * cost,
        });
      }
    }

    const materials = Array.from(byMaterial.values()).map((m) => ({
      ...m,
      totalQuantity: round4(m.totalQuantity),
      totalValueAtCost: round4(m.totalValueAtCost),
    }));

    materials.sort((a, b) => a.name.localeCompare(b.name));

    return {
      materials,
      totalValueAtCost: round4(
        materials.reduce((s, m) => s + m.totalValueAtCost, 0),
      ),
    };
  }

  // ── Pregunta D — costo real del consumo del dia ────────────────────

  /**
   * Suma allocations dentro del rango operacional para un material.
   * Es la verdad de lo que se consumio: que lotes, en que cantidades, a
   * que costo congelado al momento del movimiento.
   */
  async getRealConsumptionCost(
    materialId: string,
    range: { start: Date; end: Date },
    tx: Tx = this.prisma,
  ): Promise<RealConsumptionCost> {
    const allocations = await tx.materialLotAllocation.findMany({
      where: {
        materialId,
        movement: {
          createdAt: { gte: range.start, lt: range.end },
          quantityDelta: { lt: 0 }, // solo consumos, no ingresos
        },
      },
      select: {
        quantity: true,
        totalCostSnapshot: true,
      },
    });

    let totalQty = 0;
    let totalCost = 0;
    for (const a of allocations) {
      totalQty += toNumber(a.quantity);
      totalCost += toNumber(a.totalCostSnapshot);
    }

    return {
      totalQuantity: round4(totalQty),
      totalCost: round4(totalCost),
      weightedUnitCost:
        totalQty > 0 ? round4(totalCost / totalQty) : 0,
    };
  }

  // ── Mutadores ──────────────────────────────────────────────────────

  /**
   * Recalcula y persiste `Material.currentReferenceUnitCost` como
   * promedio ponderado de los lotes abiertos. Si todos los lotes estan
   * vacios, mantiene el ultimo valor conocido (no escribe).
   */
  async refreshReferenceCost(
    materialId: string,
    tx: Tx = this.prisma,
  ): Promise<number> {
    const lots = await this.getOpenLots(materialId, undefined, tx);
    const avg = weightedAverage(lots);

    if (avg <= 0) {
      // Sin lotes activos — mantenemos el ultimo conocido
      const current = await this.getReferenceUnitCost(materialId, tx);
      return current;
    }

    await tx.material.update({
      where: { id: materialId },
      data: { currentReferenceUnitCost: avg },
    });

    return avg;
  }

  /**
   * Validacion previa de que la cantidad pedida puede consumirse en la
   * ubicacion. Lanza `BadRequestException` si shortfall > 0.
   *
   * Decision arquitectonica: oversell prohibido. INVENTORY_COSTING.md R1.
   */
  async assertSufficientStock(
    materialId: string,
    qty: number,
    locationId: string,
    tx: Tx = this.prisma,
  ): Promise<CostQuote> {
    const quote = await this.quoteConsumption(materialId, qty, locationId, tx);
    if (quote.shortfall > 0) {
      const material = await tx.material.findUnique({
        where: { id: materialId },
        select: { name: true, baseUnit: true },
      });
      const location = await tx.inventoryLocation.findUnique({
        where: { id: locationId },
        select: { name: true },
      });
      throw new BadRequestException(
        `Stock insuficiente en ${
          location?.name ?? 'ubicación'
        } para ${material?.name ?? 'material'}: faltan ${
          quote.shortfall
        } ${material?.baseUnit ?? ''}`.trim(),
      );
    }
    return quote;
  }

  // ── Drift detection ────────────────────────────────────────────────

  /**
   * Compara cache (Material.currentStock + lotes) contra movements
   * agregados. Si divergen mas que epsilon, reporta el material.
   * Pre-requisito antes de cerrar AMD (INVENTORY_COSTING.md R5).
   */
  async detectDrift(businessId: string): Promise<InventoryDriftRow[]> {
    const drift: InventoryDriftRow[] = [];
    const EPSILON = 0.005;

    const materials = await this.prisma.material.findMany({
      where: { businessId, status: 'ACTIVE' },
      select: { id: true, name: true, currentStock: true },
    });

    const locations = await this.prisma.inventoryLocation.findMany({
      where: { businessId, status: 'ACTIVE' },
      select: { id: true, name: true },
    });

    for (const material of materials) {
      const cachedStock = toNumber(material.currentStock);

      // Suma de remaining por ubicacion
      const lotsByLocation = await this.prisma.materialLot.groupBy({
        by: ['locationId'],
        where: { materialId: material.id, remainingQuantity: { gt: 0 } },
        _sum: { remainingQuantity: true },
      });

      // Suma de movements por ubicacion
      const movementsByLocation =
        await this.prisma.materialStockMovement.groupBy({
          by: ['locationId'],
          where: { materialId: material.id },
          _sum: { quantityDelta: true },
        });

      const lotsTotal = lotsByLocation.reduce(
        (s, r) => s + toNumber(r._sum.remainingQuantity),
        0,
      );
      const movementsTotal = movementsByLocation.reduce(
        (s, r) => s + toNumber(r._sum.quantityDelta),
        0,
      );

      const lotsVsCache = Math.abs(round4(lotsTotal - cachedStock));
      const movementsVsCache = Math.abs(round4(movementsTotal - cachedStock));

      if (lotsVsCache > EPSILON || movementsVsCache > EPSILON) {
        // Reportamos por ubicacion donde haya discrepancia
        for (const loc of locations) {
          const lotsHere = toNumber(
            lotsByLocation.find((l) => l.locationId === loc.id)?._sum
              .remainingQuantity,
          );
          const movsHere = toNumber(
            movementsByLocation.find((l) => l.locationId === loc.id)?._sum
              .quantityDelta,
          );
          const localDelta = Math.abs(round4(lotsHere - movsHere));
          if (localDelta > EPSILON) {
            drift.push({
              materialId: material.id,
              materialName: material.name,
              locationId: loc.id,
              locationName: loc.name,
              cachedStock: round4(cachedStock),
              lotsRemaining: round4(lotsHere),
              movementsBalance: round4(movsHere),
              lotsVsCacheDelta: lotsVsCache,
              movementsVsCacheDelta: movementsVsCache,
            });
          }
        }
      }
    }

    return drift;
  }
}
