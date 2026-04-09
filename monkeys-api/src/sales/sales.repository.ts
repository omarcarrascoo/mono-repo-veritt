import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';

type Tx = Prisma.TransactionClient;

const saleInclude = {
  items: {
    include: {
      product: { select: { id: true, name: true, category: true } },
      recipeVersion: { select: { id: true, versionNumber: true } },
    },
  },
  payments: {
    include: {
      paymentMethod: { select: { id: true, name: true, type: true } },
    },
  },
  area: { select: { id: true, name: true, type: true } },
  operator: { select: { id: true, fullName: true, operationalRole: true } },
  theoreticalConsumptions: {
    include: {
      material: { select: { id: true, name: true, baseUnit: true } },
    },
  },
};

@Injectable()
export class SalesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }

  findStaffProfile(staffProfileId: string) {
    return this.prisma.staffProfile.findUnique({
      where: { id: staffProfileId },
    });
  }

  findArea(areaId: string) {
    return this.prisma.area.findUnique({ where: { id: areaId } });
  }

  findProduct(productId: string) {
    return this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        recipeVersions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: { items: { include: { material: true } } },
        },
      },
    });
  }

  findPaymentMethod(paymentMethodId: string) {
    return this.prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });
  }

  findProductsByIds(productIds: string[]) {
    return this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        recipeVersions: {
          orderBy: { versionNumber: 'desc' as const },
          take: 1,
          include: { items: { include: { material: true } } },
        },
      },
    });
  }

  findPaymentMethodsByIds(paymentMethodIds: string[]) {
    return this.prisma.paymentMethod.findMany({
      where: { id: { in: paymentMethodIds } },
    });
  }

  async getNextSaleNumber(tx: Tx, businessId: string): Promise<number> {
    const last = await tx.sale.findFirst({
      where: { businessId },
      orderBy: { saleNumber: 'desc' },
      select: { saleNumber: true },
    });
    return (last?.saleNumber ?? 0) + 1;
  }

  getTransaction() {
    return this.prisma.$transaction.bind(this.prisma);
  }

  get prismaClient() {
    return this.prisma;
  }

  findAll(businessId: string, filters: { status?: string; areaId?: string; operatorStaffId?: string; from?: Date; to?: Date }) {
    return this.prisma.sale.findMany({
      where: {
        businessId,
        ...(filters.status && { status: filters.status as any }),
        ...(filters.areaId && { areaId: filters.areaId }),
        ...(filters.operatorStaffId && { operatorStaffId: filters.operatorStaffId }),
        ...(filters.from || filters.to
          ? {
              createdAt: {
                ...(filters.from && { gte: filters.from }),
                ...(filters.to && { lte: filters.to }),
              },
            }
          : {}),
      },
      include: saleInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(saleId: string) {
    return this.prisma.sale.findUnique({
      where: { id: saleId },
      include: saleInclude,
    });
  }

  cancelSale(saleId: string, userId: string, reason: string) {
    return this.prisma.sale.update({
      where: { id: saleId },
      data: {
        status: 'CANCELLED',
        cancelledByUserId: userId,
        cancellationReason: reason,
        cancelledAt: new Date(),
      },
      include: saleInclude,
    });
  }

  getTheoreticalConsumptionSummary(businessId: string, from: Date, to: Date) {
    return this.prisma.theoreticalConsumption.groupBy({
      by: ['materialId'],
      where: {
        businessId,
        calculatedAt: { gte: from, lte: to },
        sale: { status: 'COMPLETED' },
      },
      _sum: {
        expectedQuantity: true,
        expectedCost: true,
      },
    });
  }

  findMaterials(materialIds: string[]) {
    return this.prisma.material.findMany({
      where: { id: { in: materialIds } },
      select: { id: true, name: true, baseUnit: true },
    });
  }

  getProductRevenueSummary(businessId: string, from: Date, to: Date) {
    return this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          businessId,
          status: 'COMPLETED',
          completedAt: { gte: from, lte: to },
        },
      },
      _sum: {
        totalPrice: true,
        quantity: true,
        costSnapshot: true,
      },
      _count: true,
    });
  }

  findProducts(productIds: string[]) {
    return this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, category: true },
    });
  }
}
