import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';

const receiptInclude = {
  purchaseOrder: {
    select: { id: true, orderNumber: true, status: true, supplierId: true },
  },
  receivedBy: { select: { id: true, fullName: true } },
  location: { select: { id: true, name: true } },
  items: {
    include: {
      material: { select: { id: true, name: true, baseUnit: true } },
    },
  },
};

@Injectable()
export class ReceiptsRepository {
  constructor(private readonly prisma: PrismaService) {}

  get prismaClient() {
    return this.prisma;
  }

  findMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }

  findLocation(locationId: string) {
    return this.prisma.inventoryLocation.findUnique({ where: { id: locationId } });
  }

  findMaterial(materialId: string) {
    return this.prisma.material.findUnique({ where: { id: materialId } });
  }

  findPurchaseOrder(poId: string) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });
  }

  findAll(businessId: string, filters: { purchaseOrderId?: string; from?: Date; to?: Date }) {
    return this.prisma.receipt.findMany({
      where: {
        businessId,
        ...(filters.purchaseOrderId && { purchaseOrderId: filters.purchaseOrderId }),
        ...(filters.from || filters.to
          ? {
              receivedAt: {
                ...(filters.from && { gte: filters.from }),
                ...(filters.to && { lte: filters.to }),
              },
            }
          : {}),
      },
      include: receiptInclude,
      orderBy: { receivedAt: 'desc' },
    });
  }

  findOne(receiptId: string) {
    return this.prisma.receipt.findUnique({
      where: { id: receiptId },
      include: receiptInclude,
    });
  }
}
