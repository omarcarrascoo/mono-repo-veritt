import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';

type Tx = Prisma.TransactionClient;

const poInclude = {
  supplier: { select: { id: true, name: true } },
  createdBy: { select: { id: true, fullName: true } },
  items: {
    include: {
      material: { select: { id: true, name: true, baseUnit: true } },
    },
  },
  receipts: { select: { id: true, receivedAt: true, status: true } },
};

@Injectable()
export class PurchaseOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  get prismaClient() {
    return this.prisma;
  }

  findMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }

  findSupplier(supplierId: string) {
    return this.prisma.supplier.findUnique({ where: { id: supplierId } });
  }

  findMaterial(materialId: string) {
    return this.prisma.material.findUnique({ where: { id: materialId } });
  }

  async getNextOrderNumber(tx: Tx, businessId: string): Promise<number> {
    const last = await tx.purchaseOrder.findFirst({
      where: { businessId },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    return (last?.orderNumber ?? 0) + 1;
  }

  findAll(businessId: string, filters: { status?: string; supplierId?: string }) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        businessId,
        ...(filters.status && { status: filters.status as any }),
        ...(filters.supplierId && { supplierId: filters.supplierId }),
      },
      include: poInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(poId: string) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: poInclude,
    });
  }

  updateStatus(poId: string, status: string, extra?: Record<string, any>) {
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: status as any, ...extra },
      include: poInclude,
    });
  }

  update(poId: string, data: Record<string, any>) {
    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data,
      include: poInclude,
    });
  }
}
