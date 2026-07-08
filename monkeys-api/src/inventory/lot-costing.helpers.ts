// ── Lot costing helpers ──────────────────────────────────────────────
// Funciones puras (sin DB, sin side-effects) para calcular costos sobre
// un set de lotes de material. Toda la logica FIFO/promedio/quote vive
// aqui — los services consumen estas funciones.
//
// Reglas:
// - No mutan los inputs.
// - No truncan precision interna; redondean solo en la salida con `round4`.
// - Si hay shortfall (no se puede cubrir la cantidad pedida), lo reportan
//   en el quote — la decision de bloquear/permitir es del caller (service).
//
// Documentado en INVENTORY_COSTING.md secciones 3 y 4.

export interface OpenLot {
  id: string;
  remainingQuantity: number;
  unitCost: number;
  receivedAt: Date;
  /** Locations son opcionales — algunos callers consultan a nivel material. */
  locationId?: string;
}

export interface CostQuoteLayer {
  lotId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface CostQuote {
  /** Costo total para cubrir la cantidad pedida (sin contar shortfall). */
  totalCost: number;
  /** Costo unitario promedio ponderado de la cantidad cubierta.
   *  Si no se cubrio nada, retorna 0. */
  unitCost: number;
  /** Cantidad efectivamente cubierta (qty - shortfall). */
  coveredQuantity: number;
  /** Layers FIFO consumidos. Vacio si shortfall = qty pedida. */
  layers: CostQuoteLayer[];
  /** Cantidad que NO se pudo cubrir con lotes activos. >= 0. */
  shortfall: number;
}

const EPSILON = 0.0005;

function round4(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(4));
}

/**
 * Ordena los lotes por receivedAt ASC, con createdAt implicito (id) como
 * tie-breaker estable. Dos lotes recibidos en el mismo timestamp se
 * resuelven por id alfanumerico — determinista pero arbitrario.
 */
export function sortFifo(lots: OpenLot[]): OpenLot[] {
  return [...lots].sort((a, b) => {
    const timeDelta = a.receivedAt.getTime() - b.receivedAt.getTime();
    if (timeDelta !== 0) return timeDelta;
    return a.id.localeCompare(b.id);
  });
}

export function filterByLocation(
  lots: OpenLot[],
  locationId: string,
): OpenLot[] {
  return lots.filter((l) => l.locationId === locationId);
}

export function filterActive(lots: OpenLot[]): OpenLot[] {
  return lots.filter((l) => l.remainingQuantity > EPSILON);
}

/**
 * Pregunta C — promedio ponderado de los lotes dados.
 * No filtra: si quieres promedio de una ubicacion, filtra antes.
 * Lotes con remainingQuantity <= 0 se ignoran (no contribuyen).
 * Retorna 0 si no hay cantidad activa.
 */
export function weightedAverage(lots: OpenLot[]): number {
  let totalQty = 0;
  let totalValue = 0;
  for (const lot of lots) {
    if (lot.remainingQuantity <= EPSILON) continue;
    totalQty += lot.remainingQuantity;
    totalValue += lot.remainingQuantity * lot.unitCost;
  }
  if (totalQty <= EPSILON) return 0;
  return round4(totalValue / totalQty);
}

/**
 * Pregunta B variante — costo del lote abierto mas antiguo (FIFO floor).
 * Retorna null si no hay lotes activos.
 */
export function fifoFloorUnitCost(lots: OpenLot[]): number | null {
  const sorted = sortFifo(filterActive(lots));
  if (sorted.length === 0) return null;
  return round4(sorted[0].unitCost);
}

/**
 * Pregunta B — simula consumir `qty` en FIFO sobre los lotes dados.
 * No muta los lotes. Devuelve un quote completo para que el caller decida.
 *
 * Si la cantidad pedida excede los lotes disponibles, `shortfall > 0` y
 * `coveredQuantity < qty`. Es responsabilidad del caller decidir si
 * bloquea (consumo real) o tolera (cotizacion previa de UI).
 */
export function quoteFifoConsumption(
  lots: OpenLot[],
  qty: number,
): CostQuote {
  if (!Number.isFinite(qty) || qty <= 0) {
    return {
      totalCost: 0,
      unitCost: 0,
      coveredQuantity: 0,
      layers: [],
      shortfall: 0,
    };
  }

  const ordered = sortFifo(filterActive(lots));
  const layers: CostQuoteLayer[] = [];
  let remaining = qty;
  let totalCost = 0;

  for (const lot of ordered) {
    if (remaining <= EPSILON) break;
    const available = lot.remainingQuantity;
    const take = Math.min(available, remaining);
    if (take <= EPSILON) continue;

    const layerTotal = take * lot.unitCost;
    layers.push({
      lotId: lot.id,
      quantity: round4(take),
      unitCost: round4(lot.unitCost),
      totalCost: round4(layerTotal),
    });

    totalCost += layerTotal;
    remaining -= take;
  }

  const coveredQuantity = round4(qty - remaining);
  const shortfall = round4(Math.max(0, remaining));

  return {
    totalCost: round4(totalCost),
    unitCost:
      coveredQuantity > EPSILON ? round4(totalCost / coveredQuantity) : 0,
    coveredQuantity,
    layers,
    shortfall,
  };
}

/**
 * Suma de cantidad disponible en los lotes dados.
 */
export function totalRemaining(lots: OpenLot[]): number {
  return round4(
    filterActive(lots).reduce((sum, l) => sum + l.remainingQuantity, 0),
  );
}

/**
 * Suma del valor total inventariado de los lotes dados (cantidad * costo).
 * Pregunta A — base de getMaterialInventoryValue.
 */
export function totalValueAtCost(lots: OpenLot[]): number {
  return round4(
    filterActive(lots).reduce(
      (sum, l) => sum + l.remainingQuantity * l.unitCost,
      0,
    ),
  );
}

export const lotCostingInternals = {
  EPSILON,
  round4,
};
