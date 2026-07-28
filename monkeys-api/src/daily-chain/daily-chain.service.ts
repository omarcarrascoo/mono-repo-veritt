import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Inject, forwardRef } from '@nestjs/common';
import { DailyChainRepository } from './daily-chain.repository';
import { LotCostingService } from '../inventory/lot-costing.service';
import { AmdService } from '../amd/amd.service';
import { CreateOpeningDto } from './dto/create-opening.dto';
import { CreateClosingDto } from './dto/create-closing.dto';
import { ClassifyDeviationDto } from './dto/classify-deviation.dto';
import { CreateReconciliationDto } from './dto/create-reconciliation.dto';
import { CreateCashOpeningDto } from './dto/create-cash-opening.dto';
import {
  getOperationalDate,
  getOperationalDateRange,
  parseOperationalDate,
} from './helpers/operational-date.helper';
import { PermissionService } from '../common/services/permission.service';

type Tx = Prisma.TransactionClient;

const round4 = (v: number) => Number(v.toFixed(4));
const toNum = (v: Prisma.Decimal | number | string | null | undefined) =>
  v === null || v === undefined ? 0 : Number(v);

@Injectable()
export class DailyChainService {
  constructor(
    private readonly repo: DailyChainRepository,
    private readonly lotCosting: LotCostingService,
    @Inject(forwardRef(() => AmdService))
    private readonly amdService: AmdService,
    private readonly permissions: PermissionService,
  ) {}

  // ── Auth helpers ──

  private async ensureAccess(businessId: string, userId: string) {
    const membership = await this.repo.findMembership(businessId, userId);
    if (!membership) throw new ForbiddenException('You do not belong to this business');
    return membership;
  }

  private async ensureManagement(businessId: string, userId: string) {
    const m = await this.ensureAccess(businessId, userId);
    if (!(await this.permissions.can(businessId, m.role, 'CHAIN_AUTHORIZE'))) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return m;
  }

  private async ensureCashOperate(businessId: string, userId: string) {
    const m = await this.ensureAccess(businessId, userId);
    if (!(await this.permissions.can(businessId, m.role, 'CASH_OPERATE'))) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return m;
  }

  private async getBusinessDate(businessId: string, dateStr?: string): Promise<Date> {
    const business = await this.repo.findBusiness(businessId);
    if (!business) throw new NotFoundException('Business not found');

    if (dateStr) return parseOperationalDate(dateStr);
    return getOperationalDate(business.operationalDayCutoffHour, business.timezone);
  }

  private async getDateRange(businessId: string, opDate: Date): Promise<{ start: Date; end: Date }> {
    const business = await this.repo.findBusiness(businessId);
    if (!business) throw new NotFoundException('Business not found');
    return getOperationalDateRange(opDate, business.operationalDayCutoffHour, business.timezone);
  }

  // ── Public: Check if day is open (used by Sales/Receipts) ──

  async isDayOpen(businessId: string, date?: Date): Promise<boolean> {
    const business = await this.repo.findBusiness(businessId);
    if (!business) return true; // Business not found = no chain enforcement

    const opDate = date ?? getOperationalDate(business.operationalDayCutoffHour, business.timezone);
    const opening = await this.repo.findOpeningForDate(businessId, opDate);

    // If no opening exists for today, the chain hasn't started — day is considered open
    // (Allows businesses to operate without the chain initially)
    if (!opening) return true;

    return opening.status === 'AUTHORIZED';
  }

  // ── Public: Check if the cash opening balance was declared (candado C2) ──
  // Used by Sales: si el día operativo está abierto (FAI autorizado) pero R2
  // no ha declarado el saldo inicial, no se puede vender. Sin cadena activa
  // (día abierto por ausencia de FAI) no se exige — cero regresión.

  async hasCashOpening(businessId: string, date?: Date): Promise<boolean> {
    const business = await this.repo.findBusiness(businessId);
    if (!business) return true;

    const opDate = date ?? getOperationalDate(business.operationalDayCutoffHour, business.timezone);

    // Solo se exige el saldo inicial cuando la cadena está activa (FAI autorizado).
    const opening = await this.repo.findOpeningForDate(businessId, opDate);
    if (!opening || opening.status !== 'AUTHORIZED') return true;

    const cashOpening = await this.repo.findCashOpening(businessId, opDate);
    return cashOpening !== null;
  }

  // ── Chain Status ──

  async getStatus(businessId: string, userId: string, dateStr?: string) {
    await this.ensureAccess(businessId, userId);
    const opDate = await this.getBusinessDate(businessId, dateStr);

    const [openingResult, cashOpening, closing, deviation, reconciliation, fop] =
      await Promise.all([
        this.repo.findOpeningForDate(businessId, opDate),
        this.repo.findCashOpening(businessId, opDate),
        this.repo.findClosingForDate(businessId, opDate),
        this.repo.findDeviationReport(businessId, opDate),
        this.repo.findReconciliation(businessId, opDate),
        this.repo.findFOP(businessId, opDate),
      ]);

    return {
      operationalDate: opDate.toISOString().split('T')[0],
      fai: openingResult
        ? { id: openingResult.id, status: openingResult.status, locationId: openingResult.locationId }
        : null,
      cashOpening: cashOpening
        ? { id: cashOpening.id, openingBalance: toNum(cashOpening.openingBalance) }
        : null,
      fci: closing
        ? { id: closing.id, status: closing.status, locationId: closing.locationId }
        : null,
      fid: deviation
        ? { id: deviation.id, status: deviation.status, totalDeviationValueMXN: toNum(deviation.totalDeviationValueMXN) }
        : null,
      faf: reconciliation
        ? { id: reconciliation.id, status: reconciliation.status, difference: toNum(reconciliation.difference) }
        : null,
      fop: fop
        ? { id: fop.id, status: fop.status, signedAt: fop.signedAt }
        : null,
    };
  }

  // ── FAI (Opening) ──

  async createOpening(businessId: string, userId: string, dto: CreateOpeningDto) {
    await this.ensureAccess(businessId, userId);
    const opDate = await this.getBusinessDate(businessId, dto.date);

    // Check if a non-rejected opening already exists for this location + date
    const existing = await this.repo.findOpening(businessId, dto.locationId, opDate);
    if (existing) {
      throw new BadRequestException('Ya existe un conteo de apertura activo para esta ubicación y fecha');
    }

    // Get previous closing for reference
    const previousClosing = await this.repo.findPreviousClosing(businessId, dto.locationId, opDate);
    const prevClosingMap = new Map<string, number>();
    if (previousClosing) {
      for (const item of previousClosing.items) {
        prevClosingMap.set(item.materialId, toNum(item.countedQuantity));
      }
    }

    // Get active materials for system quantities
    const materials = await this.repo.getActiveMaterials(businessId);
    const materialMap = new Map(materials.map((m) => [m.id, m]));

    // Pregunta B (INVENTORY_COSTING.md 4): la varianza del FAI se valua al
    // FIFO floor de la ubicacion — el costo del lote que "habria salido" si
    // el sistema hubiera reportado la cantidad real.
    const fifoFloorMap = new Map<string, number>();
    for (const item of dto.items) {
      const floor = await this.lotCosting.getFifoFloor(
        item.materialId,
        dto.locationId,
      );
      fifoFloorMap.set(item.materialId, floor);
    }

    // Build items with calculated fields
    const items = dto.items.map((item) => {
      const mat = materialMap.get(item.materialId);
      if (!mat) throw new NotFoundException(`Material no encontrado: ${item.materialId}`);

      const systemQuantity = round4(toNum(mat.currentStock));
      const previousClosingQuantity = round4(prevClosingMap.get(item.materialId) ?? 0);
      const variance = round4(item.countedQuantity - systemQuantity);
      const unitCostForValuation = fifoFloorMap.get(item.materialId) ?? 0;
      const varianceValueMXN = round4(variance * unitCostForValuation);

      return {
        materialId: item.materialId,
        countedQuantity: round4(item.countedQuantity),
        previousClosingQuantity,
        systemQuantity,
        variance,
        varianceValueMXN,
        varianceNote: item.varianceNote,
      };
    });

    return this.repo.prismaClient.$transaction(async (tx: Tx) => {
      return this.repo.createOpening(tx, {
        businessId,
        locationId: dto.locationId,
        operationalDate: opDate,
        createdByUserId: userId,
        items,
      });
    });
  }

  async authorizeOpening(businessId: string, openingId: string, userId: string) {
    await this.ensureManagement(businessId, userId);

    const opening = await this.repo.findOpeningById(openingId);
    if (!opening || opening.businessId !== businessId) {
      throw new NotFoundException('Conteo de apertura no encontrado');
    }
    if (opening.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden autorizar conteos pendientes');
    }
    if (opening.createdByUserId === userId) {
      throw new ForbiddenException('No puedes autorizar tu propio conteo de apertura');
    }

    return this.repo.prismaClient.$transaction(async (tx: Tx) => {
      return this.repo.authorizeOpening(tx, openingId, userId);
    });
  }

  async rejectOpening(businessId: string, openingId: string, userId: string, reason: string) {
    await this.ensureManagement(businessId, userId);

    const opening = await this.repo.findOpeningById(openingId);
    if (!opening || opening.businessId !== businessId) {
      throw new NotFoundException('Conteo de apertura no encontrado');
    }
    if (opening.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden rechazar conteos pendientes');
    }

    return this.repo.prismaClient.$transaction(async (tx: Tx) => {
      return this.repo.rejectOpening(tx, openingId, reason);
    });
  }

  async getOpening(businessId: string, userId: string, dateStr?: string, locationId?: string) {
    await this.ensureAccess(businessId, userId);
    const opDate = await this.getBusinessDate(businessId, dateStr);

    if (locationId) {
      return this.repo.findOpening(businessId, locationId, opDate);
    }
    return this.repo.findOpeningForDate(businessId, opDate);
  }

  // ── FCI (Closing) ──

  async createClosing(businessId: string, userId: string, dto: CreateClosingDto) {
    await this.ensureAccess(businessId, userId);
    const opDate = await this.getBusinessDate(businessId, dto.date);
    const range = await this.getDateRange(businessId, opDate);

    // Pre-condition: FAI must be AUTHORIZED
    const opening = await this.repo.findOpening(businessId, dto.locationId, opDate);
    if (!opening || opening.status !== 'AUTHORIZED') {
      throw new BadRequestException('El conteo de apertura (FAI) debe estar autorizado antes de cerrar');
    }

    // Check if a non-rejected closing already exists
    const existing = await this.repo.findClosing(businessId, dto.locationId, opDate);
    if (existing) {
      throw new BadRequestException('Ya existe un conteo de cierre activo para esta ubicación y fecha');
    }

    // Build opening quantity map
    const openingMap = new Map<string, number>();
    for (const item of opening.items) {
      openingMap.set(item.materialId, toNum(item.countedQuantity));
    }

    // Get receipts for the day (using operational date range)
    const receipts = await this.repo.getReceiptsForDate(businessId, range);
    const receivedMap = new Map<string, number>();
    for (const r of receipts) {
      const prev = receivedMap.get(r.materialId) ?? 0;
      receivedMap.set(r.materialId, round4(prev + toNum(r.quantityReceived)));
    }

    // Build closing items
    const items = dto.items.map((item) => {
      const openingQty = openingMap.get(item.materialId) ?? 0;
      const receivedQty = receivedMap.get(item.materialId) ?? 0;
      const realConsumption = round4(openingQty + receivedQty - item.countedQuantity);

      return {
        materialId: item.materialId,
        countedQuantity: round4(item.countedQuantity),
        openingQuantity: round4(openingQty),
        receivedQuantity: round4(receivedQty),
        realConsumption,
      };
    });

    return this.repo.prismaClient.$transaction(async (tx: Tx) => {
      return this.repo.createClosing(tx, {
        businessId,
        locationId: dto.locationId,
        operationalDate: opDate,
        createdByUserId: userId,
        items,
      });
    });
  }

  async getClosing(businessId: string, userId: string, dateStr?: string) {
    await this.ensureAccess(businessId, userId);
    const opDate = await this.getBusinessDate(businessId, dateStr);
    return this.repo.findClosingForDate(businessId, opDate);
  }

  async authorizeClosing(businessId: string, closingId: string, userId: string) {
    await this.ensureManagement(businessId, userId);

    const closing = await this.repo.findClosingById(closingId);
    if (!closing || closing.businessId !== businessId) {
      throw new NotFoundException('Conteo de cierre no encontrado');
    }
    if (closing.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden autorizar conteos pendientes');
    }
    if (closing.createdByUserId === userId) {
      throw new ForbiddenException('No puedes autorizar tu propio conteo de cierre');
    }

    const opDate = closing.operationalDate;
    const range = await this.getDateRange(businessId, opDate);

    // Get theoretical consumption for deviation report (using operational date range)
    const theoretical = await this.repo.getTheoreticalConsumptionForDate(businessId, range);
    const theoreticalMap = new Map<string, number>();
    for (const t of theoretical) {
      theoreticalMap.set(t.materialId, toNum(t._sum.expectedQuantity));
    }

    // Pregunta D (INVENTORY_COSTING.md 4): valuamos la desviacion al costo
    // real promedio de las allocations del dia. Si no hubo movimientos
    // (caso raro: la merma se midio solo por FCI sin produccion), fallback
    // al promedio agregado del material.
    const realCostMap = new Map<string, number>();
    const fallbackCostMap = new Map<string, number>();
    const materials = await this.repo.getActiveMaterials(businessId);
    for (const m of materials) {
      fallbackCostMap.set(m.id, toNum(m.currentReferenceUnitCost));
      const realCost = await this.lotCosting.getRealConsumptionCost(m.id, range);
      if (realCost.weightedUnitCost > 0) {
        realCostMap.set(m.id, realCost.weightedUnitCost);
      }
    }

    return this.repo.prismaClient.$transaction(async (tx: Tx) => {
      const authorized = await this.repo.authorizeClosing(tx, closingId, userId);

      // Auto-generate FID (deviation report)
      const deviationItems = closing.items.map((item) => {
        const theoretical = theoreticalMap.get(item.materialId) ?? 0;
        const realConsumption = toNum(item.realConsumption);
        const deviationQuantity = round4(realConsumption - theoretical);
        const unitCost =
          realCostMap.get(item.materialId) ??
          fallbackCostMap.get(item.materialId) ??
          0;
        const deviationValueMXN = round4(deviationQuantity * unitCost);

        return {
          materialId: item.materialId,
          theoreticalConsumption: round4(theoretical),
          realConsumption: round4(realConsumption),
          deviationQuantity,
          deviationValueMXN,
        };
      });

      const totalDeviationValueMXN = round4(
        deviationItems.reduce((sum, d) => sum + Math.abs(d.deviationValueMXN), 0),
      );

      await this.repo.createDeviationReport(tx, {
        businessId,
        operationalDate: opDate,
        totalDeviationValueMXN,
        items: deviationItems,
      });

      return authorized;
    });
  }

  async rejectClosing(businessId: string, closingId: string, userId: string, reason: string) {
    await this.ensureManagement(businessId, userId);

    const closing = await this.repo.findClosingById(closingId);
    if (!closing || closing.businessId !== businessId) {
      throw new NotFoundException('Conteo de cierre no encontrado');
    }
    if (closing.status !== 'PENDING') {
      throw new BadRequestException('Solo se pueden rechazar conteos pendientes');
    }

    return this.repo.prismaClient.$transaction(async (tx: Tx) => {
      return this.repo.rejectClosing(tx, closingId, reason);
    });
  }

  // ── FID (Deviations) ──

  async getDeviations(businessId: string, userId: string, dateStr?: string) {
    await this.ensureAccess(businessId, userId);
    const opDate = await this.getBusinessDate(businessId, dateStr);
    return this.repo.findDeviationReport(businessId, opDate);
  }

  async classifyDeviations(
    businessId: string,
    reportId: string,
    userId: string,
    dto: ClassifyDeviationDto,
  ) {
    await this.ensureAccess(businessId, userId);

    const report = await this.repo.findDeviationReportById(reportId);
    if (!report || report.businessId !== businessId) {
      throw new NotFoundException('Reporte de desviaciones no encontrado');
    }
    if (report.status === 'APPROVED') {
      throw new BadRequestException('Este reporte ya fue aprobado');
    }

    return this.repo.prismaClient.$transaction(async (tx: Tx) => {
      return this.repo.classifyDeviationItems(tx, reportId, dto.items, userId);
    });
  }

  async approveDeviations(businessId: string, reportId: string, userId: string) {
    await this.ensureManagement(businessId, userId);

    const report = await this.repo.findDeviationReportById(reportId);
    if (!report || report.businessId !== businessId) {
      throw new NotFoundException('Reporte de desviaciones no encontrado');
    }
    if (report.status !== 'CLASSIFIED') {
      throw new BadRequestException('Todas las desviaciones deben estar clasificadas antes de aprobar');
    }

    return this.repo.prismaClient.$transaction(async (tx: Tx) => {
      return this.repo.approveDeviationReport(tx, reportId, userId);
    });
  }

  // ── Saldo inicial de caja (candado C2) ──

  async getCashOpening(businessId: string, userId: string, dateStr?: string) {
    await this.ensureAccess(businessId, userId);
    const opDate = await this.getBusinessDate(businessId, dateStr);
    return this.repo.findCashOpening(businessId, opDate);
  }

  async declareCashOpening(
    businessId: string,
    userId: string,
    dto: CreateCashOpeningDto,
  ) {
    await this.ensureCashOperate(businessId, userId);
    const opDate = await this.getBusinessDate(businessId, dto.date);

    // Uno por día: no se puede redeclarar (candado C2 — el saldo es estructural).
    const existing = await this.repo.findCashOpening(businessId, opDate);
    if (existing) {
      throw new BadRequestException(
        'Ya se declaró el saldo inicial de caja para esta fecha',
      );
    }

    return this.repo.createCashOpening({
      businessId,
      operationalDate: opDate,
      openingBalance: round4(dto.openingBalance),
      notes: dto.notes,
      declaredByUserId: userId,
    });
  }

  // ── FAF (Reconciliation) ──

  async createReconciliation(
    businessId: string,
    userId: string,
    dto: CreateReconciliationDto,
  ) {
    await this.ensureAccess(businessId, userId);
    const opDate = await this.getBusinessDate(businessId, dto.date);

    // Pre-condition: FID must be APPROVED (manager approved)
    const deviation = await this.repo.findDeviationReport(businessId, opDate);
    if (!deviation || deviation.status !== 'APPROVED') {
      throw new BadRequestException(
        'Las desviaciones (FID) deben estar aprobadas por un gerente antes de hacer el arqueo',
      );
    }

    // Check if reconciliation already exists
    const existing = await this.repo.findReconciliation(businessId, opDate);
    if (existing) {
      throw new BadRequestException('Ya existe un arqueo para esta fecha');
    }

    // Calculate expected totals from sales (using operational date range)
    const range = await this.getDateRange(businessId, opDate);
    const cashSalesExpected = await this.repo.getCashExpectedTotal(businessId, range);
    const transferExpected = await this.repo.getTransferExpectedTotal(businessId, range);
    const terminalExpected = await this.repo.getSalesExpectedByPaymentMethod(businessId, range);

    // Candado C2: el efectivo esperado parte del saldo inicial de caja declarado
    // por R2. Ese float sigue físicamente en el cajón al cierre, así que el conteo
    // por denominaciones ya lo incluye. Sin saldo declarado → 0 (cero regresión).
    const cashOpening = await this.repo.findCashOpening(businessId, opDate);
    const openingBalance = toNum(cashOpening?.openingBalance);
    const cashExpected = round4(openingBalance + cashSalesExpected);

    // Build terminal expected map (exclude CASH and BANK_TRANSFER — handled separately)
    const terminalExpectedMap = new Map<string, number>();
    for (const t of terminalExpected) {
      terminalExpectedMap.set(t.paymentMethodId, toNum(t._sum.amount));
    }

    // Cash counted = sum of denominations
    const cashCounted = round4(
      dto.cashDenominations.reduce((sum, d) => sum + round4(d.denomination * d.quantity), 0),
    );

    // Terminal reconciliations
    const terminalRecons = (dto.terminalTotals ?? []).map((t) => {
      const expected = terminalExpectedMap.get(t.paymentMethodId) ?? 0;
      return {
        paymentMethodId: t.paymentMethodId,
        expectedTotal: round4(expected),
        reportedTotal: round4(t.reportedTotal),
        reference: t.reference,
        difference: round4(t.reportedTotal - expected),
      };
    });

    // Transfer reconciliations
    const transferRecons = (dto.transferTotals ?? []).map((t) => ({
      expectedTotal: round4(transferExpected),
      reportedTotal: round4(t.reportedTotal),
      folioReferences: t.folioReferences,
      difference: round4(t.reportedTotal - transferExpected),
    }));

    // Total expected vs counted
    const totalExpected = round4(
      cashExpected +
      terminalRecons.reduce((sum, t) => sum + t.expectedTotal, 0) +
      (transferRecons[0]?.expectedTotal ?? 0),
    );
    const totalCounted = round4(
      cashCounted +
      terminalRecons.reduce((sum, t) => sum + t.reportedTotal, 0) +
      transferRecons.reduce((sum, t) => sum + t.reportedTotal, 0),
    );
    const totalDifference = round4(totalCounted - totalExpected);

    // Always create as PENDING_REVIEW — manager must approve
    return this.repo.prismaClient.$transaction(async (tx: Tx) => {
      const recon = await this.repo.createReconciliation(tx, {
        businessId,
        operationalDate: opDate,
        createdByUserId: userId,
        totalExpected,
        totalCounted,
        difference: totalDifference,
        status: 'PENDING_REVIEW',
        cashDenominations: dto.cashDenominations.map((d) => ({
          denomination: d.denomination,
          quantity: d.quantity,
          subtotal: round4(d.denomination * d.quantity),
        })),
        terminalReconciliations: terminalRecons,
        transferReconciliations: transferRecons,
      });

      return recon;
    });
  }

  // ── FAF Approval ──

  async getReconciliation(businessId: string, userId: string, dateStr?: string) {
    await this.ensureAccess(businessId, userId);
    const opDate = await this.getBusinessDate(businessId, dateStr);
    return this.repo.findReconciliation(businessId, opDate);
  }

  async approveReconciliation(
    businessId: string,
    reconciliationId: string,
    userId: string,
  ) {
    await this.ensureManagement(businessId, userId);

    const recon = await this.repo.findReconciliationById(reconciliationId);
    if (!recon || recon.businessId !== businessId) {
      throw new NotFoundException('Arqueo no encontrado');
    }
    if (recon.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Solo se pueden aprobar arqueos en revisión');
    }
    if (recon.createdByUserId === userId) {
      throw new ForbiddenException('No puedes aprobar tu propio arqueo');
    }

    const difference = Number(recon.difference);
    const finalStatus = Math.abs(difference) > 0.005 ? 'DISCREPANCY' : 'RECONCILED';

    return this.repo.prismaClient.$transaction(async (tx: Tx) => {
      const approved = await this.repo.approveReconciliation(
        tx,
        reconciliationId,
        userId,
        finalStatus,
      );

      // Generate FOP in both cases. With DISCREPANCY, the FOP will be BLOCKED
      // and require a manager to sign with documented justification.
      await this.generateFOP(tx, businessId, recon.operationalDate);

      return approved;
    });
  }

  async rejectReconciliation(
    businessId: string,
    reconciliationId: string,
    userId: string,
    reason: string,
  ) {
    await this.ensureManagement(businessId, userId);

    const trimmed = (reason ?? '').trim();
    if (!trimmed) {
      throw new BadRequestException('Debes indicar el motivo del rechazo');
    }

    const recon = await this.repo.findReconciliationById(reconciliationId);
    if (!recon || recon.businessId !== businessId) {
      throw new NotFoundException('Arqueo no encontrado');
    }
    if (recon.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Solo se pueden rechazar arqueos en revisión');
    }
    if (recon.createdByUserId === userId) {
      throw new ForbiddenException('No puedes rechazar tu propio arqueo');
    }

    return this.repo.prismaClient.$transaction(async (tx: Tx) => {
      return this.repo.rejectReconciliation(tx, reconciliationId, userId, trimmed);
    });
  }

  // ── FOP ──

  // Exposed for one-shot backfill script; not used by controller.
  async backfillFOP(businessId: string, opDate: Date) {
    return this.repo.prismaClient.$transaction(async (tx: Tx) => {
      return this.generateFOP(tx, businessId, opDate);
    });
  }

  private async generateFOP(tx: Tx, businessId: string, opDate: Date) {
    // Gather validation data (using operational date range)
    const range = await this.getDateRange(businessId, opDate);
    const opening = await this.repo.findOpeningForDate(businessId, opDate);
    const reconciliation = await this.repo.findReconciliation(businessId, opDate);
    const processStatus = await this.repo.getBlockingProcessesStatus(businessId, range);
    const shiftMinutes = await this.repo.getShiftHoursForDate(businessId, range);

    const validationItems: Array<{
      validationType: string;
      label: string;
      operatorValue: number;
      systemValue: number;
      difference: number;
      isWithinThreshold: boolean;
    }> = [];

    // INVENTORY: total variance value from FAI
    const inventoryVariance = opening
      ? round4(opening.items.reduce((sum, i) => sum + Math.abs(toNum(i.varianceValueMXN)), 0))
      : 0;
    validationItems.push({
      validationType: 'INVENTORY',
      label: 'Varianza de inventario (FAI)',
      operatorValue: inventoryVariance,
      systemValue: 0,
      difference: inventoryVariance,
      isWithinThreshold: inventoryVariance === 0,
    });

    // CASH: difference from FAF
    const cashDiff = reconciliation ? toNum(reconciliation.difference) : 0;
    validationItems.push({
      validationType: 'CASH',
      label: 'Diferencia de arqueo (FAF)',
      operatorValue: toNum(reconciliation?.totalCounted),
      systemValue: toNum(reconciliation?.totalExpected),
      difference: cashDiff,
      isWithinThreshold: Math.abs(cashDiff) < 0.01,
    });

    // PROCESSES: blocking processes completion
    validationItems.push({
      validationType: 'PROCESSES',
      label: 'Procesos bloqueantes completados',
      operatorValue: processStatus.completed,
      systemValue: processStatus.total,
      difference: processStatus.total - processStatus.completed,
      isWithinThreshold: processStatus.completed >= processStatus.total,
    });

    // HOURS: total shift minutes
    validationItems.push({
      validationType: 'HOURS',
      label: 'Horas de turno registradas (minutos)',
      operatorValue: shiftMinutes,
      systemValue: shiftMinutes,
      difference: 0,
      isWithinThreshold: true,
    });

    const allValid = validationItems.every((v) => v.isWithinThreshold);
    const status = allValid ? 'PENDING' : 'BLOCKED';

    return this.repo.createFOP(tx, {
      businessId,
      operationalDate: opDate,
      status,
      validationItems,
    });
  }

  async getFOP(businessId: string, userId: string, dateStr?: string) {
    await this.ensureAccess(businessId, userId);
    const opDate = await this.getBusinessDate(businessId, dateStr);
    return this.repo.findFOP(businessId, opDate);
  }

  async signFOP(
    businessId: string,
    fopId: string,
    userId: string,
    opts?: { discrepancyJustification?: string },
  ) {
    const membership = await this.ensureManagement(businessId, userId);

    if (!(await this.permissions.can(businessId, membership.role, 'CHAIN_SIGN'))) {
      throw new ForbiddenException(
        'Solo el gerente (R4) o superior puede firmar el FOP',
      );
    }

    const fop = await this.repo.findFOPById(fopId);
    if (!fop || fop.businessId !== businessId) {
      throw new NotFoundException('FOP no encontrado');
    }
    if (fop.status === 'SIGNED') {
      throw new BadRequestException('Este FOP ya fue firmado');
    }

    const justification = opts?.discrepancyJustification?.trim();

    if (fop.status === 'BLOCKED') {
      if (!justification) {
        throw new BadRequestException(
          'El FOP está bloqueado. Debes proporcionar una justificación para firmar con discrepancia.',
        );
      }
    }

    // Firma + generacion del AMD en la misma transaccion. Si el builder
    // falla → rollback completo, la firma se revierte ("si no hay AMD no
    // hay dia firmado", decision 2 INVENTORY_COSTING.md).
    //
    // Timeout de 30s: el builder hace agregaciones de todo el dia
    // (sales, theoretical, allocations, shifts, processes, etc). El
    // default de Prisma es 5s — insuficiente en pooler de Supabase con
    // un dia con volumen real.
    return this.repo.prismaClient.$transaction(
      async (tx: Tx) => {
        const signed = await this.repo.signFOP(tx, fopId, userId, {
          discrepancyJustification: justification,
        });
        await this.amdService.generateForFOP(tx, {
          id: signed.id,
          businessId: signed.businessId,
          operationalDate: signed.operationalDate,
        });
        return signed;
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  }

  // ── History ──

  async getHistory(businessId: string, userId: string, from: string, to: string) {
    await this.ensureAccess(businessId, userId);
    const fromDate = parseOperationalDate(from);
    const toDate = parseOperationalDate(to);
    return this.repo.getChainHistory(businessId, fromDate, toDate);
  }
}
