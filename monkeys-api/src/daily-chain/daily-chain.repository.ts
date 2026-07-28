import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';

type Tx = Prisma.TransactionClient;

const openingInclude = {
  location: { select: { id: true, name: true } },
  items: {
    include: { material: { select: { id: true, name: true, baseUnit: true } } },
    orderBy: { material: { name: 'asc' as const } },
  },
} satisfies Prisma.DailyInventoryOpeningInclude;

const closingInclude = {
  location: { select: { id: true, name: true } },
  items: {
    include: { material: { select: { id: true, name: true, baseUnit: true } } },
    orderBy: { material: { name: 'asc' as const } },
  },
} satisfies Prisma.DailyInventoryClosingInclude;

const deviationInclude = {
  items: {
    include: { material: { select: { id: true, name: true, baseUnit: true } } },
    orderBy: { material: { name: 'asc' as const } },
  },
} satisfies Prisma.DailyDeviationReportInclude;

const reconciliationInclude = {
  cashDenominations: { orderBy: { denomination: 'desc' as const } },
  terminalReconciliations: {
    include: { paymentMethod: { select: { id: true, name: true, type: true } } },
  },
  transferReconciliations: true,
} satisfies Prisma.DailyCashReconciliationInclude;

const fopInclude = {
  validationItems: { orderBy: { validationType: 'asc' as const } },
} satisfies Prisma.DailyOperationCloseInclude;

@Injectable()
export class DailyChainRepository {
  constructor(private readonly prisma: PrismaService) {}

  get prismaClient() {
    return this.prisma;
  }

  // ── Membership ──

  async findMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });
  }

  // ── Business ──

  async findBusiness(businessId: string) {
    return this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, operationalDayCutoffHour: true, timezone: true },
    });
  }

  // ── FAI (Opening) ──

  async findOpening(businessId: string, locationId: string, operationalDate: Date) {
    return this.prisma.dailyInventoryOpening.findFirst({
      where: { businessId, locationId, operationalDate, status: { not: 'REJECTED' } },
      include: openingInclude,
    });
  }

  async findOpeningById(openingId: string) {
    return this.prisma.dailyInventoryOpening.findUnique({
      where: { id: openingId },
      include: openingInclude,
    });
  }

  async findOpeningForDate(businessId: string, operationalDate: Date) {
    return this.prisma.dailyInventoryOpening.findFirst({
      where: { businessId, operationalDate, status: { not: 'REJECTED' } },
      include: openingInclude,
    });
  }

  async createOpening(
    tx: Tx,
    data: {
      businessId: string;
      locationId: string;
      operationalDate: Date;
      createdByUserId: string;
      items: Array<{
        materialId: string;
        countedQuantity: number;
        previousClosingQuantity: number;
        systemQuantity: number;
        variance: number;
        varianceValueMXN: number;
        varianceNote?: string;
      }>;
    },
  ) {
    return tx.dailyInventoryOpening.create({
      data: {
        businessId: data.businessId,
        locationId: data.locationId,
        operationalDate: data.operationalDate,
        createdByUserId: data.createdByUserId,
        items: {
          create: data.items.map((item) => ({
            materialId: item.materialId,
            countedQuantity: item.countedQuantity,
            previousClosingQuantity: item.previousClosingQuantity,
            systemQuantity: item.systemQuantity,
            variance: item.variance,
            varianceValueMXN: item.varianceValueMXN,
            varianceNote: item.varianceNote ?? null,
          })),
        },
      },
      include: openingInclude,
    });
  }

  async authorizeOpening(tx: Tx, openingId: string, userId: string) {
    return tx.dailyInventoryOpening.update({
      where: { id: openingId },
      data: { status: 'AUTHORIZED', authorizedByUserId: userId, authorizedAt: new Date() },
      include: openingInclude,
    });
  }

  async rejectOpening(tx: Tx, openingId: string, reason: string) {
    return tx.dailyInventoryOpening.update({
      where: { id: openingId },
      data: { status: 'REJECTED', rejectedReason: reason },
      include: openingInclude,
    });
  }

  // ── FCI (Closing) ──

  async findClosing(businessId: string, locationId: string, operationalDate: Date) {
    return this.prisma.dailyInventoryClosing.findFirst({
      where: { businessId, locationId, operationalDate, status: { not: 'REJECTED' } },
      include: closingInclude,
    });
  }

  async findPreviousClosing(businessId: string, locationId: string, beforeDate: Date) {
    return this.prisma.dailyInventoryClosing.findFirst({
      where: { businessId, locationId, operationalDate: { lt: beforeDate }, status: 'AUTHORIZED' },
      orderBy: { operationalDate: 'desc' },
      include: closingInclude,
    });
  }

  async findClosingById(closingId: string) {
    return this.prisma.dailyInventoryClosing.findUnique({
      where: { id: closingId },
      include: closingInclude,
    });
  }

  async findClosingForDate(businessId: string, operationalDate: Date) {
    return this.prisma.dailyInventoryClosing.findFirst({
      where: { businessId, operationalDate, status: { not: 'REJECTED' } },
      include: closingInclude,
    });
  }

  async createClosing(
    tx: Tx,
    data: {
      businessId: string;
      locationId: string;
      operationalDate: Date;
      createdByUserId: string;
      items: Array<{
        materialId: string;
        countedQuantity: number;
        openingQuantity: number;
        receivedQuantity: number;
        realConsumption: number;
      }>;
    },
  ) {
    return tx.dailyInventoryClosing.create({
      data: {
        businessId: data.businessId,
        locationId: data.locationId,
        operationalDate: data.operationalDate,
        createdByUserId: data.createdByUserId,
        status: 'PENDING',
        items: {
          create: data.items.map((item) => ({
            materialId: item.materialId,
            countedQuantity: item.countedQuantity,
            openingQuantity: item.openingQuantity,
            receivedQuantity: item.receivedQuantity,
            realConsumption: item.realConsumption,
          })),
        },
      },
      include: closingInclude,
    });
  }

  async authorizeClosing(tx: Tx, closingId: string, userId: string) {
    return tx.dailyInventoryClosing.update({
      where: { id: closingId },
      data: {
        status: 'AUTHORIZED',
        authorizedByUserId: userId,
        authorizedAt: new Date(),
      },
      include: closingInclude,
    });
  }

  async rejectClosing(tx: Tx, closingId: string, reason: string) {
    return tx.dailyInventoryClosing.update({
      where: { id: closingId },
      data: { status: 'REJECTED', rejectedReason: reason },
      include: closingInclude,
    });
  }

  // ── FID (Deviations) ──

  async findDeviationReport(businessId: string, operationalDate: Date) {
    return this.prisma.dailyDeviationReport.findUnique({
      where: { businessId_operationalDate: { businessId, operationalDate } },
      include: deviationInclude,
    });
  }

  async findDeviationReportById(reportId: string) {
    return this.prisma.dailyDeviationReport.findUnique({
      where: { id: reportId },
      include: deviationInclude,
    });
  }

  async createDeviationReport(
    tx: Tx,
    data: {
      businessId: string;
      operationalDate: Date;
      totalDeviationValueMXN: number;
      items: Array<{
        materialId: string;
        theoreticalConsumption: number;
        realConsumption: number;
        deviationQuantity: number;
        deviationValueMXN: number;
      }>;
    },
  ) {
    return tx.dailyDeviationReport.create({
      data: {
        businessId: data.businessId,
        operationalDate: data.operationalDate,
        totalDeviationValueMXN: data.totalDeviationValueMXN,
        items: {
          create: data.items.map((item) => ({
            materialId: item.materialId,
            theoreticalConsumption: item.theoreticalConsumption,
            realConsumption: item.realConsumption,
            deviationQuantity: item.deviationQuantity,
            deviationValueMXN: item.deviationValueMXN,
          })),
        },
      },
      include: deviationInclude,
    });
  }

  async classifyDeviationItems(
    tx: Tx,
    reportId: string,
    items: Array<{ materialId: string; cause: string; note?: string }>,
    userId: string,
  ) {
    for (const item of items) {
      await tx.deviationItem.updateMany({
        where: { reportId, materialId: item.materialId },
        data: {
          cause: item.cause as any,
          classifiedByUserId: userId,
          note: item.note ?? null,
        },
      });
    }

    // Check if all non-zero deviations are classified
    const unclassified = await tx.deviationItem.count({
      where: {
        reportId,
        NOT: { deviationQuantity: 0 },
        cause: null,
      },
    });

    const newStatus = unclassified === 0 ? 'CLASSIFIED' : 'PENDING_CLASSIFICATION';
    return tx.dailyDeviationReport.update({
      where: { id: reportId },
      data: { status: newStatus as any },
      include: deviationInclude,
    });
  }

  async approveDeviationReport(tx: Tx, reportId: string, userId: string) {
    return tx.dailyDeviationReport.update({
      where: { id: reportId },
      data: { status: 'APPROVED', approvedByUserId: userId, approvedAt: new Date() },
      include: deviationInclude,
    });
  }

  // ── Saldo inicial de caja (C2) ──

  async findCashOpening(businessId: string, operationalDate: Date) {
    return this.prisma.dailyCashOpening.findUnique({
      where: { businessId_operationalDate: { businessId, operationalDate } },
    });
  }

  async createCashOpening(data: {
    businessId: string;
    operationalDate: Date;
    openingBalance: number;
    notes?: string;
    declaredByUserId: string;
  }) {
    return this.prisma.dailyCashOpening.create({ data });
  }

  // ── FAF (Reconciliation) ──

  async findReconciliation(businessId: string, operationalDate: Date) {
    return this.prisma.dailyCashReconciliation.findFirst({
      where: { businessId, operationalDate, status: { not: 'REJECTED' } },
      include: reconciliationInclude,
    });
  }

  async createReconciliation(
    tx: Tx,
    data: {
      businessId: string;
      operationalDate: Date;
      createdByUserId: string;
      totalExpected: number;
      totalCounted: number;
      difference: number;
      status: 'PENDING_REVIEW' | 'RECONCILED' | 'DISCREPANCY';
      cashDenominations: Array<{ denomination: number; quantity: number; subtotal: number }>;
      terminalReconciliations: Array<{
        paymentMethodId: string;
        expectedTotal: number;
        reportedTotal: number;
        reference?: string;
        difference: number;
      }>;
      transferReconciliations: Array<{
        expectedTotal: number;
        reportedTotal: number;
        folioReferences?: string;
        difference: number;
      }>;
    },
  ) {
    return tx.dailyCashReconciliation.create({
      data: {
        businessId: data.businessId,
        operationalDate: data.operationalDate,
        createdByUserId: data.createdByUserId,
        totalExpected: data.totalExpected,
        totalCounted: data.totalCounted,
        difference: data.difference,
        status: data.status,
        reconciledByUserId: data.status === 'RECONCILED' ? data.createdByUserId : null,
        reconciledAt: data.status === 'RECONCILED' ? new Date() : null,
        cashDenominations: { create: data.cashDenominations },
        terminalReconciliations: { create: data.terminalReconciliations },
        transferReconciliations: { create: data.transferReconciliations },
      },
      include: reconciliationInclude,
    });
  }

  async findReconciliationById(reconciliationId: string) {
    return this.prisma.dailyCashReconciliation.findUnique({
      where: { id: reconciliationId },
      include: reconciliationInclude,
    });
  }

  async approveReconciliation(
    tx: Tx,
    reconciliationId: string,
    userId: string,
    finalStatus: 'RECONCILED' | 'DISCREPANCY',
  ) {
    return tx.dailyCashReconciliation.update({
      where: { id: reconciliationId },
      data: {
        status: finalStatus,
        approvedByUserId: userId,
        approvedAt: new Date(),
        reconciledByUserId: finalStatus === 'RECONCILED' ? userId : null,
        reconciledAt: finalStatus === 'RECONCILED' ? new Date() : null,
      },
      include: reconciliationInclude,
    });
  }

  async rejectReconciliation(
    tx: Tx,
    reconciliationId: string,
    userId: string,
    reason: string,
  ) {
    return tx.dailyCashReconciliation.update({
      where: { id: reconciliationId },
      data: {
        status: 'REJECTED',
        rejectedByUserId: userId,
        rejectedAt: new Date(),
        rejectedReason: reason,
      },
      include: reconciliationInclude,
    });
  }

  // ── FOP ──

  async findFOP(businessId: string, operationalDate: Date) {
    return this.prisma.dailyOperationClose.findUnique({
      where: { businessId_operationalDate: { businessId, operationalDate } },
      include: fopInclude,
    });
  }

  async findFOPById(fopId: string) {
    return this.prisma.dailyOperationClose.findUnique({
      where: { id: fopId },
      include: fopInclude,
    });
  }

  async createFOP(
    tx: Tx,
    data: {
      businessId: string;
      operationalDate: Date;
      status: 'PENDING' | 'BLOCKED';
      validationItems: Array<{
        validationType: string;
        label: string;
        operatorValue: number;
        systemValue: number;
        difference: number;
        isWithinThreshold: boolean;
      }>;
    },
  ) {
    return tx.dailyOperationClose.create({
      data: {
        businessId: data.businessId,
        operationalDate: data.operationalDate,
        status: data.status,
        validationItems: {
          create: data.validationItems.map((item) => ({
            validationType: item.validationType as any,
            label: item.label,
            operatorValue: item.operatorValue,
            systemValue: item.systemValue,
            difference: item.difference,
            isWithinThreshold: item.isWithinThreshold,
          })),
        },
      },
      include: fopInclude,
    });
  }

  async signFOP(
    tx: Tx,
    fopId: string,
    userId: string,
    opts?: { discrepancyJustification?: string },
  ) {
    const justification = opts?.discrepancyJustification?.trim();
    return tx.dailyOperationClose.update({
      where: { id: fopId },
      data: {
        status: 'SIGNED',
        signedByUserId: userId,
        signedAt: new Date(),
        signedWithDiscrepancy: !!justification,
        discrepancyJustification: justification || null,
      },
      include: fopInclude,
    });
  }

  // ── Aggregation queries ──
  // All methods accept a { start, end } range representing the operational day in UTC.

  async getReceiptsForDate(businessId: string, range: { start: Date; end: Date }) {
    return this.prisma.receiptItem.findMany({
      where: {
        receipt: {
          businessId,
          status: 'COMPLETED',
          receivedAt: { gte: range.start, lt: range.end },
        },
      },
      select: { materialId: true, quantityReceived: true },
    });
  }

  async getTheoreticalConsumptionForDate(businessId: string, range: { start: Date; end: Date }) {
    return this.prisma.theoreticalConsumption.groupBy({
      by: ['materialId'],
      where: {
        businessId,
        calculatedAt: { gte: range.start, lt: range.end },
      },
      _sum: { expectedQuantity: true },
    });
  }

  async getSalesExpectedByPaymentMethod(businessId: string, range: { start: Date; end: Date }) {
    return this.prisma.salePayment.groupBy({
      by: ['paymentMethodId'],
      where: {
        sale: {
          businessId,
          status: 'COMPLETED',
          completedAt: { gte: range.start, lt: range.end },
        },
      },
      _sum: { amount: true },
    });
  }

  async getCashExpectedTotal(businessId: string, range: { start: Date; end: Date }): Promise<number> {
    const result = await this.prisma.salePayment.aggregate({
      where: {
        sale: {
          businessId,
          status: 'COMPLETED',
          completedAt: { gte: range.start, lt: range.end },
        },
        paymentMethod: { type: 'CASH' },
      },
      _sum: { amount: true },
    });

    return Number(result._sum.amount ?? 0);
  }

  async getTransferExpectedTotal(businessId: string, range: { start: Date; end: Date }): Promise<number> {
    const result = await this.prisma.salePayment.aggregate({
      where: {
        sale: {
          businessId,
          status: 'COMPLETED',
          completedAt: { gte: range.start, lt: range.end },
        },
        paymentMethod: { type: 'BANK_TRANSFER' },
      },
      _sum: { amount: true },
    });

    return Number(result._sum.amount ?? 0);
  }

  async getBlockingProcessesStatus(businessId: string, range: { start: Date; end: Date }) {
    const blockingProcesses = await this.prisma.processTemplate.findMany({
      where: { businessId, isBlocking: true, status: 'ACTIVE' },
      select: { id: true, name: true },
    });

    const completedExecutions = await this.prisma.processExecution.findMany({
      where: {
        businessId,
        processId: { in: blockingProcesses.map((p) => p.id) },
        status: 'COMPLETED',
        completedAt: { gte: range.start, lt: range.end },
      },
      select: { processId: true },
    });

    const completedIds = new Set(completedExecutions.map((e) => e.processId));

    return {
      total: blockingProcesses.length,
      completed: completedIds.size,
      pending: blockingProcesses.filter((p) => !completedIds.has(p.id)),
    };
  }

  async getShiftHoursForDate(businessId: string, range: { start: Date; end: Date }) {
    const shifts = await this.prisma.shiftLog.findMany({
      where: {
        businessId,
        clockInAt: { gte: range.start, lt: range.end },
        status: 'COMPLETED',
      },
      select: { totalMinutes: true },
    });

    return shifts.reduce((sum, s) => sum + (s.totalMinutes ?? 0), 0);
  }

  async getActiveMaterials(businessId: string) {
    return this.prisma.material.findMany({
      where: { businessId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        baseUnit: true,
        currentStock: true,
        currentReferenceUnitCost: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // ── History ──

  async getChainHistory(businessId: string, from: Date, to: Date) {
    const [openings, closings, deviations, reconciliations, fops] = await Promise.all([
      this.prisma.dailyInventoryOpening.findMany({
        where: { businessId, operationalDate: { gte: from, lte: to } },
        select: { operationalDate: true, status: true },
        orderBy: { operationalDate: 'desc' },
      }),
      this.prisma.dailyInventoryClosing.findMany({
        where: { businessId, operationalDate: { gte: from, lte: to } },
        select: { operationalDate: true, status: true },
        orderBy: { operationalDate: 'desc' },
      }),
      this.prisma.dailyDeviationReport.findMany({
        where: { businessId, operationalDate: { gte: from, lte: to } },
        select: { operationalDate: true, status: true, totalDeviationValueMXN: true },
        orderBy: { operationalDate: 'desc' },
      }),
      this.prisma.dailyCashReconciliation.findMany({
        where: { businessId, operationalDate: { gte: from, lte: to } },
        select: { operationalDate: true, status: true, difference: true },
        orderBy: { operationalDate: 'desc' },
      }),
      this.prisma.dailyOperationClose.findMany({
        where: { businessId, operationalDate: { gte: from, lte: to } },
        select: { operationalDate: true, status: true, signedAt: true },
        orderBy: { operationalDate: 'desc' },
      }),
    ]);

    return { openings, closings, deviations, reconciliations, fops };
  }
}
