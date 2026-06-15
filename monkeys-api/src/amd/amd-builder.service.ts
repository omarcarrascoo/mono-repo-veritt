import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma/prisma.service';
import { LotCostingService } from '../inventory/lot-costing.service';
import { getOperationalDateRange } from '../daily-chain/helpers/operational-date.helper';
import {
  AMD_SCHEMA_VERSION,
  AMDContentV1,
  AMDFAFSnapshot,
  AMDFAISnapshot,
  AMDFCISnapshot,
  AMDFIDSnapshot,
  AMDFOPSnapshot,
  AMDP1Summary,
  AMDP2Financials,
  AMDP3Operational,
  AMDP4Alerts,
  AMDP5Traceability,
  AMDP6UserPerformance,
  AMDProcessExecutionSnapshot,
  AMDShiftSnapshot,
} from './types/amd-content.types';

type Tx = Prisma.TransactionClient | PrismaService;

const round2 = (n: number) => Number(n.toFixed(2));
const round4 = (n: number) => Number(n.toFixed(4));
const toNum = (v: Prisma.Decimal | number | string | null | undefined) =>
  v === null || v === undefined ? 0 : Number(v);

// ── AMD Builder ──────────────────────────────────────────────────────
// Construye el contentJson del AMD a partir de:
// - El FOP firmado (raiz de la cadena)
// - Datos del business y usuarios
// - Aggregaciones financieras del rango operacional
// - Snapshot del inventario via LotCostingService
// - El AMD del dia anterior (para comparativos en P1)
//
// Snapshot completo: ningun campo es FK — todos los nombres, costos,
// roles, etc se copian al contentJson para que sobreviva a borrados
// futuros (decision 3 INVENTORY_COSTING.md).

@Injectable()
export class AmdBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lotCosting: LotCostingService,
  ) {}

  /**
   * Construye el contentJson v1 para el FOP firmado dado.
   * Recibe `tx` para poder ejecutarse dentro de la transaccion del
   * `signFOP` (rollback completo si algo falla).
   */
  async build(fopId: string, tx: Tx = this.prisma): Promise<AMDContentV1> {
    const fop = await tx.dailyOperationClose.findUnique({
      where: { id: fopId },
      include: {
        validationItems: true,
        business: true,
      },
    });
    if (!fop) {
      throw new Error(`FOP no encontrado: ${fopId}`);
    }

    const business = fop.business;
    const opDate = fop.operationalDate;
    const range = getOperationalDateRange(
      opDate,
      business.operationalDayCutoffHour,
      business.timezone,
    );

    // ── Cargas paralelas ────────────────────────────────────────────
    const [fai, fci, fid, faf] = await Promise.all([
      tx.dailyInventoryOpening.findFirst({
        where: { businessId: business.id, operationalDate: opDate },
        include: { items: { include: { material: true } }, location: true },
      }),
      tx.dailyInventoryClosing.findFirst({
        where: { businessId: business.id, operationalDate: opDate },
        include: { items: { include: { material: true } }, location: true },
      }),
      tx.dailyDeviationReport.findFirst({
        where: { businessId: business.id, operationalDate: opDate },
        include: { items: { include: { material: true } } },
      }),
      tx.dailyCashReconciliation.findFirst({
        where: { businessId: business.id, operationalDate: opDate },
        include: {
          cashDenominations: true,
          terminalReconciliations: { include: { paymentMethod: true } },
          transferReconciliations: true,
        },
      }),
    ]);

    const [sales, inventoryValue, yesterdayAmd] = await Promise.all([
      tx.sale.findMany({
        where: {
          businessId: business.id,
          completedAt: { gte: range.start, lt: range.end },
          status: 'COMPLETED',
        },
        include: {
          items: true,
          payments: { include: { paymentMethod: true } },
          operator: { select: { userId: true } },
        },
      }),
      this.lotCosting.getBusinessInventoryValue(business.id, tx),
      this.findYesterdayAmd(business.id, opDate, tx),
    ]);

    // ── Construccion de pestanas ────────────────────────────────────
    // P1, P2, P3, P5, P6 hacen sus propias queries (theoretical, opex,
    // shifts, etc). Las paralelizamos para minimizar tiempo dentro de la
    // transaccion. P4 depende de P1, asi que se hace despues.
    const meta = this.buildMeta(business, fop, opDate);
    const [p1, p2, p3, p5, p6] = await Promise.all([
      this.buildP1(business.id, sales, fid, range, yesterdayAmd, tx),
      this.buildP2(
        business.id,
        sales,
        fid,
        faf,
        inventoryValue,
        range,
        tx,
      ),
      this.buildP3(fai, fci, fid, faf, fop, business.id, range, tx),
      this.buildP5(business.id, sales, range, tx),
      this.buildP6(
        business.id,
        sales,
        fid,
        fop,
        fai,
        fci,
        faf,
        range,
        tx,
      ),
    ]);
    const p4 = this.buildP4(p1);

    return {
      schemaVersion: AMD_SCHEMA_VERSION,
      meta,
      p1_summary: p1,
      p2_financials: p2,
      p3_operational: p3,
      p4_alerts: p4,
      p5_traceability: p5,
      p6_user_performance: p6,
    };
  }

  // ── Meta ──

  private buildMeta(
    business: {
      id: string;
      name: string;
      timezone: string;
      operationalDayCutoffHour: number;
      defaultCurrency: string;
    },
    fop: {
      id: string;
      signedByUserId: string | null;
      signedAt: Date | null;
      signedWithDiscrepancy: boolean;
      discrepancyJustification: string | null;
    },
    opDate: Date,
  ) {
    return {
      businessId: business.id,
      businessName: business.name,
      operationalDate: opDate.toISOString().split('T')[0],
      timezone: business.timezone,
      cutoffHour: business.operationalDayCutoffHour,
      generatedAt: new Date().toISOString(),
      fopId: fop.id,
      fopSignedByUserId: fop.signedByUserId,
      fopSignedAt: fop.signedAt?.toISOString() ?? null,
      fopSignedWithDiscrepancy: fop.signedWithDiscrepancy,
      fopDiscrepancyJustification: fop.discrepancyJustification,
      currency: business.defaultCurrency,
    };
  }

  // ── P1 — Resumen humano ──

  private async buildP1(
    businessId: string,
    sales: Array<{ total: Prisma.Decimal | number | string }>,
    fid: { items: Array<{ deviationValueMXN: Prisma.Decimal }> } | null,
    range: { start: Date; end: Date },
    yesterdayAmd: AMDContentV1 | null,
    tx: Tx,
  ): Promise<AMDP1Summary> {
    const grossRevenue = sales.reduce((s, sale) => s + toNum(sale.total), 0);
    const ticketCount = sales.length;
    const avgTicket = ticketCount > 0 ? grossRevenue / ticketCount : 0;

    const theoreticalCost = await tx.theoreticalConsumption.aggregate({
      where: {
        businessId,
        calculatedAt: { gte: range.start, lt: range.end },
      },
      _sum: { expectedCost: true },
    });
    const theoreticalCogs = toNum(theoreticalCost._sum.expectedCost);

    const realDeviation = fid
      ? fid.items.reduce((s, i) => s + toNum(i.deviationValueMXN), 0)
      : 0;
    const realCogs = theoreticalCogs + realDeviation;

    const margin = grossRevenue - realCogs;
    const marginPercent = grossRevenue > 0 ? (margin / grossRevenue) * 100 : 0;

    const payrollPaid = await tx.payrollPayment.aggregate({
      where: {
        businessId,
        paidAt: { gte: range.start, lt: range.end },
        status: 'PAID',
      },
      _sum: { amount: true },
    });

    return {
      revenue: {
        gross: round2(grossRevenue),
        ticketCount,
        avgTicket: round2(avgTicket),
      },
      cogs: {
        theoretical: round2(theoreticalCogs),
        real: round2(realCogs),
        deviationValue: round2(realDeviation),
      },
      margin: {
        absolute: round2(margin),
        percent: round2(marginPercent),
      },
      laborCost: {
        paidToday: round2(toNum(payrollPaid._sum.amount)),
        accruedThisPeriod: 0, // MVP: requiere LaborLiabilitySnapshot (sprint 2)
      },
      vsYesterday: yesterdayAmd
        ? {
            revenueDelta: round2(
              grossRevenue - yesterdayAmd.p1_summary.revenue.gross,
            ),
            marginDeltaPercent: round2(
              marginPercent - yesterdayAmd.p1_summary.margin.percent,
            ),
          }
        : null,
      alerts: { count: 0 }, // se rellena en buildP4
    };
  }

  // ── P2 — Estados financieros ──

  private async buildP2(
    businessId: string,
    sales: Array<{
      total: Prisma.Decimal | number | string;
      payments: Array<{
        amount: Prisma.Decimal | number | string;
        paymentMethod: { type: string };
      }>;
    }>,
    fid: { items: Array<{ deviationValueMXN: Prisma.Decimal }> } | null,
    faf: { totalCounted: Prisma.Decimal | number | string } | null,
    inventoryValue: {
      materials: Array<{
        materialId: string;
        name: string;
        baseUnit: string;
        totalQuantity: number;
        totalValueAtCost: number;
      }>;
      totalValueAtCost: number;
    },
    range: { start: Date; end: Date },
    tx: Tx,
  ): Promise<AMDP2Financials> {
    const revenue = sales.reduce((s, sale) => s + toNum(sale.total), 0);

    const theoreticalAgg = await tx.theoreticalConsumption.aggregate({
      where: {
        businessId,
        calculatedAt: { gte: range.start, lt: range.end },
      },
      _sum: { expectedCost: true },
    });
    const materialCost = toNum(theoreticalAgg._sum.expectedCost);
    const realDeviation = fid
      ? fid.items.reduce((s, i) => s + toNum(i.deviationValueMXN), 0)
      : 0;
    const totalCogs = materialCost + realDeviation;

    const grossProfit = revenue - totalCogs;

    const payrollPaid = await tx.payrollPayment.aggregate({
      where: {
        businessId,
        paidAt: { gte: range.start, lt: range.end },
        status: 'PAID',
      },
      _sum: { amount: true },
    });
    const laborExpense = toNum(payrollPaid._sum.amount);

    // Operating expenses: SupplierInvoices fechadas en el rango.
    // Usamos invoiceDate como aproximacion al "gasto del periodo".
    const opex = await tx.supplierInvoice.aggregate({
      where: {
        businessId,
        invoiceDate: { gte: range.start, lt: range.end },
      },
      _sum: { totalAmount: true },
    });
    const operatingExpenses = toNum(opex?._sum.totalAmount);

    const netResult = grossProfit - laborExpense - operatingExpenses;

    // Cash flow
    const cashSales = sales.reduce((s, sale) => {
      const cash = sale.payments
        .filter((p) => p.paymentMethod.type === 'CASH')
        .reduce((a, p) => a + toNum(p.amount), 0);
      return s + cash;
    }, 0);

    const cashFromAllSales = sales.reduce((s, sale) => {
      return s + sale.payments.reduce((a, p) => a + toNum(p.amount), 0);
    }, 0);

    const cashCounted = faf ? toNum(faf.totalCounted) : 0;

    return {
      incomeStatement: {
        revenue: round2(revenue),
        costOfGoodsSold: {
          material: round2(materialCost + realDeviation),
          directLabor: 0,
          allocatedCif: 0,
          total: round2(totalCogs),
        },
        grossProfit: round2(grossProfit),
        laborExpense: round2(laborExpense),
        operatingExpenses: round2(operatingExpenses),
        netResult: round2(netResult),
      },
      balanceSheetSnapshot: {
        assets: {
          cash: round2(cashCounted),
          inventoryAtCost: round2(inventoryValue.totalValueAtCost),
          inventoryDetail: inventoryValue.materials.map((m) => ({
            materialId: m.materialId,
            name: m.name,
            baseUnit: m.baseUnit,
            totalQuantity: round4(m.totalQuantity),
            totalValueAtCost: round2(m.totalValueAtCost),
          })),
          accountsReceivable: 0,
        },
        liabilities: {
          accruedLaborBenefits: 0, // MVP: pendiente LaborLiabilitySnapshot
          accountsPayable: 0,
        },
        equity: round2(
          cashCounted +
            inventoryValue.totalValueAtCost -
            0, // sin pasivos en MVP
        ),
      },
      cashFlow: {
        inflows: {
          sales: round2(cashFromAllSales),
          other: 0,
        },
        outflows: {
          receipts: round2(operatingExpenses),
          payroll: round2(laborExpense),
          other: 0,
        },
        net: round2(cashFromAllSales - operatingExpenses - laborExpense),
      },
    };
  }

  // ── P3 — Detalle operativo ──

  private async buildP3(
    fai: Prisma.DailyInventoryOpeningGetPayload<{
      include: { items: { include: { material: true } }; location: true };
    }> | null,
    fci: Prisma.DailyInventoryClosingGetPayload<{
      include: { items: { include: { material: true } }; location: true };
    }> | null,
    fid: Prisma.DailyDeviationReportGetPayload<{
      include: { items: { include: { material: true } } };
    }> | null,
    faf: Prisma.DailyCashReconciliationGetPayload<{
      include: {
        cashDenominations: true;
        terminalReconciliations: { include: { paymentMethod: true } };
        transferReconciliations: true;
      };
    }> | null,
    fop: Prisma.DailyOperationCloseGetPayload<{
      include: { validationItems: true };
    }>,
    businessId: string,
    range: { start: Date; end: Date },
    tx: Tx,
  ): Promise<AMDP3Operational> {
    const faiSnap: AMDFAISnapshot | null = fai
      ? {
          id: fai.id,
          status: fai.status,
          locationId: fai.locationId,
          locationName: fai.location.name,
          authorizedByUserId: fai.authorizedByUserId,
          authorizedAt: fai.authorizedAt?.toISOString() ?? null,
          rejectedReason: fai.rejectedReason,
          createdByUserId: fai.createdByUserId,
          createdAt: fai.createdAt.toISOString(),
          items: fai.items.map((i) => ({
            materialId: i.materialId,
            materialName: i.material.name,
            baseUnit: i.material.baseUnit,
            countedQuantity: round4(toNum(i.countedQuantity)),
            previousClosingQuantity: round4(toNum(i.previousClosingQuantity)),
            systemQuantity: round4(toNum(i.systemQuantity)),
            variance: round4(toNum(i.variance)),
            varianceValueMXN: round2(toNum(i.varianceValueMXN)),
            varianceNote: i.varianceNote,
          })),
        }
      : null;

    const fciSnap: AMDFCISnapshot | null = fci
      ? {
          id: fci.id,
          status: fci.status,
          locationId: fci.locationId,
          locationName: fci.location.name,
          authorizedByUserId: fci.authorizedByUserId,
          authorizedAt: fci.authorizedAt?.toISOString() ?? null,
          rejectedReason: fci.rejectedReason,
          createdByUserId: fci.createdByUserId,
          createdAt: fci.createdAt.toISOString(),
          items: fci.items.map((i) => ({
            materialId: i.materialId,
            materialName: i.material.name,
            baseUnit: i.material.baseUnit,
            countedQuantity: round4(toNum(i.countedQuantity)),
            openingQuantity: round4(toNum(i.openingQuantity)),
            receivedQuantity: round4(toNum(i.receivedQuantity)),
            realConsumption: round4(toNum(i.realConsumption)),
          })),
        }
      : null;

    const fidSnap: AMDFIDSnapshot | null = fid
      ? {
          id: fid.id,
          status: fid.status,
          totalDeviationValueMXN: round2(toNum(fid.totalDeviationValueMXN)),
          approvedByUserId: fid.approvedByUserId,
          approvedAt: fid.approvedAt?.toISOString() ?? null,
          createdAt: fid.createdAt.toISOString(),
          items: fid.items.map((i) => ({
            materialId: i.materialId,
            materialName: i.material.name,
            baseUnit: i.material.baseUnit,
            theoreticalConsumption: round4(toNum(i.theoreticalConsumption)),
            realConsumption: round4(toNum(i.realConsumption)),
            deviationQuantity: round4(toNum(i.deviationQuantity)),
            deviationValueMXN: round2(toNum(i.deviationValueMXN)),
            cause: i.cause,
            classifiedByUserId: i.classifiedByUserId,
            note: i.note,
          })),
        }
      : null;

    const fafSnap: AMDFAFSnapshot | null = faf
      ? {
          id: faf.id,
          status: faf.status,
          totalExpected: round2(toNum(faf.totalExpected)),
          totalCounted: round2(toNum(faf.totalCounted)),
          difference: round2(toNum(faf.difference)),
          approvedByUserId: faf.approvedByUserId,
          approvedAt: faf.approvedAt?.toISOString() ?? null,
          rejectedReason: faf.rejectedReason,
          createdAt: faf.createdAt.toISOString(),
          cashDenominations: faf.cashDenominations.map((d) => ({
            denomination: toNum(d.denomination),
            quantity: toNum(d.quantity),
            subtotal: round2(toNum(d.subtotal)),
          })),
          terminalReconciliations: faf.terminalReconciliations.map((t) => ({
            paymentMethodId: t.paymentMethodId,
            paymentMethodName: t.paymentMethod.name,
            expectedTotal: round2(toNum(t.expectedTotal)),
            reportedTotal: round2(toNum(t.reportedTotal)),
            reference: t.reference,
            difference: round2(toNum(t.difference)),
          })),
          transferReconciliations: faf.transferReconciliations.map((t) => ({
            expectedTotal: round2(toNum(t.expectedTotal)),
            reportedTotal: round2(toNum(t.reportedTotal)),
            folioReferences: t.folioReferences,
            difference: round2(toNum(t.difference)),
          })),
        }
      : null;

    const fopSnap: AMDFOPSnapshot = {
      id: fop.id,
      status: fop.status,
      signedByUserId: fop.signedByUserId,
      signedAt: fop.signedAt?.toISOString() ?? null,
      signedWithDiscrepancy: fop.signedWithDiscrepancy,
      discrepancyJustification: fop.discrepancyJustification,
      validations: fop.validationItems.map((v) => ({
        validationType: v.validationType,
        label: v.label,
        operatorValue: round4(toNum(v.operatorValue)),
        systemValue: round4(toNum(v.systemValue)),
        difference: round4(toNum(v.difference)),
        isWithinThreshold: v.isWithinThreshold,
        resolution: v.resolution,
      })),
    };

    // Process executions del rango. La FK es `processId` y la relacion
    // se llama `process` (apunta a ProcessTemplate). El usuario ejecutor
    // se carga en una segunda query — User no tiene relacion directa
    // desde ProcessExecution.
    const executions = await tx.processExecution.findMany({
      where: {
        businessId,
        startedAt: { gte: range.start, lt: range.end },
      },
      include: {
        process: { select: { name: true } },
      },
    });
    const userIds = Array.from(
      new Set(executions.map((e) => e.executedByUserId).filter(Boolean)),
    );
    const users = userIds.length
      ? await tx.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.fullName]));
    const processExecutions: AMDProcessExecutionSnapshot[] = executions.map(
      (e) => ({
        id: e.id,
        templateId: e.processId,
        templateName: e.process.name,
        status: e.status,
        executedByUserId: e.executedByUserId,
        executedByName: userMap.get(e.executedByUserId) ?? null,
        startedAt: e.startedAt?.toISOString() ?? null,
        completedAt: e.completedAt?.toISOString() ?? null,
        notes: e.notesJson ? JSON.stringify(e.notesJson) : null,
      }),
    );

    // Shifts del rango
    const shiftLogs = await tx.shiftLog.findMany({
      where: {
        businessId,
        clockInAt: { gte: range.start, lt: range.end },
      },
      include: {
        staffProfile: {
          select: { fullName: true, operationalRole: true },
        },
        area: { select: { name: true } },
      },
    });
    const shifts: AMDShiftSnapshot[] = shiftLogs.map((s) => ({
      id: s.id,
      staffProfileId: s.staffProfileId,
      staffFullName: s.staffProfile.fullName,
      operationalRole: s.staffProfile.operationalRole,
      areaId: s.areaId,
      areaName: s.area?.name ?? null,
      clockInAt: s.clockInAt.toISOString(),
      clockOutAt: s.clockOutAt?.toISOString() ?? null,
      totalMinutes: s.totalMinutes ?? 0,
      status: s.status,
    }));

    return {
      fai: faiSnap,
      fci: fciSnap,
      fid: fidSnap,
      faf: fafSnap,
      fop: fopSnap,
      processExecutions,
      shifts,
    };
  }

  // ── P4 — Alertas (MVP hardcoded) ──

  private buildP4(p1: AMDP1Summary): AMDP4Alerts {
    const alerts: AMDP4Alerts['alerts'] = [];

    if (p1.margin.percent < 20 && p1.revenue.gross > 0) {
      alerts.push({
        code: 'LOW_MARGIN_DAY',
        severity: 'warning',
        message: `Margen del día por debajo del 20% (${p1.margin.percent.toFixed(1)}%).`,
        evidence: {
          marginPercent: p1.margin.percent,
          revenue: p1.revenue.gross,
        },
      });
    }

    if (p1.cogs.deviationValue > 500) {
      alerts.push({
        code: 'HIGH_COGS_DEVIATION',
        severity: 'critical',
        message: `Desviación de costo de ventas mayor a $500 (${p1.cogs.deviationValue.toFixed(2)}).`,
        evidence: { deviationValue: p1.cogs.deviationValue },
      });
    }

    if (p1.revenue.ticketCount === 0) {
      alerts.push({
        code: 'NO_SALES_TODAY',
        severity: 'warning',
        message: 'No se registraron ventas en el día operativo.',
        evidence: {},
      });
    }

    p1.alerts.count = alerts.length;
    return { rulesVersion: 1, alerts };
  }

  // ── P5 — Trazabilidad fiscal ──

  private async buildP5(
    businessId: string,
    sales: Array<{ id: string }>,
    range: { start: Date; end: Date },
    tx: Tx,
  ): Promise<AMDP5Traceability> {
    // MVP: completitud documental sobre lo que ya tenemos en DB.
    const totalSales = sales.length;
    // No tenemos campo cfdi todavia → todas cuentan sin CFDI por ahora.
    const salesWithCfdi = 0;
    const salesWithoutCfdi = totalSales - salesWithCfdi;
    const salesPercent =
      totalSales > 0 ? (salesWithCfdi / totalSales) * 100 : 100;

    const receipts = await tx.receipt.findMany({
      where: {
        businessId,
        receivedAt: { gte: range.start, lt: range.end },
        status: 'COMPLETED',
      },
      select: {
        id: true,
        purchaseOrderId: true,
      },
    });
    const totalReceipts = receipts.length;
    // Como heuristica MVP: "con factura" = receipt vinculado a una PO con
    // SupplierInvoice asociada.
    const receiptsWithInvoice = receipts.filter((r) => r.purchaseOrderId).length;
    const receiptsPercent =
      totalReceipts > 0 ? (receiptsWithInvoice / totalReceipts) * 100 : 100;

    const supplierInvoices = await tx.supplierInvoice.findMany({
      where: {
        businessId,
        invoiceDate: { gte: range.start, lt: range.end },
      },
      select: { cfdiUuid: true },
    });
    const totalInvoices = supplierInvoices.length;
    // CFDI UUID presente = factura con respaldo fiscal real.
    const invoicesWithDoc = supplierInvoices.filter(
      (i) => i.cfdiUuid && i.cfdiUuid.trim().length > 0,
    ).length;
    const invoicesPercent =
      totalInvoices > 0 ? (invoicesWithDoc / totalInvoices) * 100 : 100;

    const overallPct =
      (salesPercent + receiptsPercent + invoicesPercent) / 3;
    const overall: 'GREEN' | 'YELLOW' | 'RED' =
      overallPct >= 90 ? 'GREEN' : overallPct >= 60 ? 'YELLOW' : 'RED';

    return {
      documentCompleteness: {
        sales: {
          total: totalSales,
          withCfdi: salesWithCfdi,
          withoutCfdi: salesWithoutCfdi,
          percent: round2(salesPercent),
        },
        receipts: {
          total: totalReceipts,
          withInvoice: receiptsWithInvoice,
          withoutInvoice: totalReceipts - receiptsWithInvoice,
          percent: round2(receiptsPercent),
        },
        supplierInvoices: {
          total: totalInvoices,
          withDocument: invoicesWithDoc,
          withoutDocument: totalInvoices - invoicesWithDoc,
          percent: round2(invoicesPercent),
        },
        overall,
      },
    };
  }

  // ── P6 — Rendimiento por usuario ──

  private async buildP6(
    businessId: string,
    sales: Array<{
      id: string;
      total: Prisma.Decimal | number | string;
      operator: { userId: string | null };
    }>,
    fid: { items: Array<{ classifiedByUserId: string | null; deviationValueMXN: Prisma.Decimal }> } | null,
    fop: { signedByUserId: string | null },
    fai: { createdByUserId: string } | null,
    fci: { createdByUserId: string } | null,
    faf: { createdByUserId: string } | null,
    range: { start: Date; end: Date },
    tx: Tx,
  ): Promise<AMDP6UserPerformance> {
    type UserAccum = {
      userId: string;
      fullName: string;
      role: string | null;
      hoursWorked: number;
      actions: {
        salesCreated: number;
        salesValue: number;
        receiptsCreated: number;
        processesExecuted: number;
        faiCreated: number;
        fciCreated: number;
        fafCreated: number;
        fopSigned: number;
        deviationsClassified: number;
      };
      deviationsAttributed: { count: number; valueMXN: number };
    };

    // Cargas paralelas para evitar serial round-trips dentro de la
    // transaccion (P2028 timeout en pooler de Supabase).
    const [shifts, receipts, executions] = await Promise.all([
      tx.shiftLog.findMany({
        where: {
          businessId,
          clockInAt: { gte: range.start, lt: range.end },
        },
        include: { staffProfile: { select: { userId: true } } },
      }),
      tx.receipt.findMany({
        where: {
          businessId,
          receivedAt: { gte: range.start, lt: range.end },
          status: 'COMPLETED',
        },
        select: { receivedByUserId: true },
      }),
      tx.processExecution.findMany({
        where: {
          businessId,
          startedAt: { gte: range.start, lt: range.end },
        },
        select: { executedByUserId: true },
      }),
    ]);

    // Recolectamos todos los userIds que vamos a tocar
    const userIds = new Set<string>();
    for (const s of shifts) {
      if (s.staffProfile.userId) userIds.add(s.staffProfile.userId);
    }
    for (const sale of sales) {
      if (sale.operator.userId) userIds.add(sale.operator.userId);
    }
    for (const r of receipts) {
      if (r.receivedByUserId) userIds.add(r.receivedByUserId);
    }
    for (const e of executions) {
      if (e.executedByUserId) userIds.add(e.executedByUserId);
    }
    if (fai) userIds.add(fai.createdByUserId);
    if (fci) userIds.add(fci.createdByUserId);
    if (faf) userIds.add(faf.createdByUserId);
    if (fop.signedByUserId) userIds.add(fop.signedByUserId);
    if (fid) {
      for (const item of fid.items) {
        if (item.classifiedByUserId) userIds.add(item.classifiedByUserId);
      }
    }

    // Una sola query batch para todos los usuarios — con su rol en este
    // negocio. Reemplaza el N+1 anterior.
    const userRows = userIds.size
      ? await tx.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: {
            id: true,
            fullName: true,
            memberships: {
              where: { businessId },
              select: { role: true },
              take: 1,
            },
          },
        })
      : [];
    const userInfoMap = new Map(
      userRows.map((u) => [
        u.id,
        {
          fullName: u.fullName,
          role: u.memberships[0]?.role ?? null,
        },
      ]),
    );

    const acc = new Map<string, UserAccum>();
    const ensureUser = (userId: string): UserAccum => {
      let entry = acc.get(userId);
      if (entry) return entry;
      const info = userInfoMap.get(userId);
      entry = {
        userId,
        fullName: info?.fullName ?? 'Usuario',
        role: info?.role ?? null,
        hoursWorked: 0,
        actions: {
          salesCreated: 0,
          salesValue: 0,
          receiptsCreated: 0,
          processesExecuted: 0,
          faiCreated: 0,
          fciCreated: 0,
          fafCreated: 0,
          fopSigned: 0,
          deviationsClassified: 0,
        },
        deviationsAttributed: { count: 0, valueMXN: 0 },
      };
      acc.set(userId, entry);
      return entry;
    };

    // Horas trabajadas
    for (const s of shifts) {
      if (!s.staffProfile.userId) continue;
      const u = ensureUser(s.staffProfile.userId);
      u.hoursWorked += (s.totalMinutes ?? 0) / 60;
    }

    // Ventas atribuibles
    for (const sale of sales) {
      const operatorUserId = sale.operator.userId;
      if (!operatorUserId) continue;
      const u = ensureUser(operatorUserId);
      u.actions.salesCreated += 1;
      u.actions.salesValue += toNum(sale.total);
    }

    // Recepciones
    for (const r of receipts) {
      if (!r.receivedByUserId) continue;
      const u = ensureUser(r.receivedByUserId);
      u.actions.receiptsCreated += 1;
    }

    // Procesos
    for (const e of executions) {
      if (!e.executedByUserId) continue;
      const u = ensureUser(e.executedByUserId);
      u.actions.processesExecuted += 1;
    }

    // Creadores de FAI/FCI/FAF + firma del FOP — usamos los datos que
    // el caller ya cargo en el `build()` principal, sin nuevas queries.
    if (fai) ensureUser(fai.createdByUserId).actions.faiCreated += 1;
    if (fci) ensureUser(fci.createdByUserId).actions.fciCreated += 1;
    if (faf) ensureUser(faf.createdByUserId).actions.fafCreated += 1;
    if (fop.signedByUserId) {
      ensureUser(fop.signedByUserId).actions.fopSigned += 1;
    }

    // Clasificaciones de desviaciones
    if (fid) {
      for (const item of fid.items) {
        if (!item.classifiedByUserId) continue;
        const u = ensureUser(item.classifiedByUserId);
        u.actions.deviationsClassified += 1;
        u.deviationsAttributed.count += 1;
        u.deviationsAttributed.valueMXN += toNum(item.deviationValueMXN);
      }
    }

    const users = Array.from(acc.values()).map((u) => ({
      ...u,
      hoursWorked: round2(u.hoursWorked),
      actions: {
        ...u.actions,
        salesValue: round2(u.actions.salesValue),
      },
      deviationsAttributed: {
        count: u.deviationsAttributed.count,
        valueMXN: round2(u.deviationsAttributed.valueMXN),
      },
    }));

    users.sort((a, b) => a.fullName.localeCompare(b.fullName));
    return { users };
  }

  // ── Yesterday lookup ──

  private async findYesterdayAmd(
    businessId: string,
    opDate: Date,
    tx: Tx,
  ): Promise<AMDContentV1 | null> {
    const yesterday = new Date(opDate);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const found = await tx.dailyMasterArchive.findFirst({
      where: { businessId, operationalDate: yesterday },
      select: { contentJson: true },
    });
    if (!found) return null;
    return found.contentJson as unknown as AMDContentV1;
  }
}
