import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { CreateSupplierInvoiceDto } from './dto/create-supplier-invoice.dto';
import { UpdateSupplierInvoiceDto } from './dto/update-supplier-invoice.dto';

const invoiceInclude = {
  supplier: { select: { id: true, name: true } },
  receipt: {
    select: {
      id: true,
      receivedAt: true,
      status: true,
      location: { select: { id: true, name: true } },
      purchaseOrder: { select: { id: true, orderNumber: true } },
      items: {
        select: {
          materialId: true,
          quantityReceived: true,
          actualUnitCost: true,
          material: { select: { id: true, name: true } },
        },
      },
    },
  },
  verifiedBy: { select: { id: true, fullName: true } },
  deletedBy: { select: { id: true, fullName: true } },
};

@Injectable()
export class SupplierInvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMembership(businessId: string, userId: string) {
    return this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });
  }

  findSupplier(supplierId: string) {
    return this.prisma.supplier.findUnique({ where: { id: supplierId } });
  }

  findReceipt(receiptId: string) {
    return this.prisma.receipt.findUnique({ where: { id: receiptId } });
  }

  findReceiptWithItems(receiptId: string) {
    return this.prisma.receipt.findUnique({
      where: { id: receiptId },
      include: { items: true },
    });
  }

  findAll(businessId: string, filters: { supplierId?: string; status?: string }) {
    return this.prisma.supplierInvoice.findMany({
      where: {
        businessId,
        ...(filters.supplierId && { supplierId: filters.supplierId }),
        ...(filters.status && { status: filters.status as any }),
      },
      include: invoiceInclude,
      orderBy: { invoiceDate: 'desc' },
    });
  }

  findOne(invoiceId: string) {
    return this.prisma.supplierInvoice.findUnique({
      where: { id: invoiceId },
      include: invoiceInclude,
    });
  }

  create(
    businessId: string,
    dto: CreateSupplierInvoiceDto & { receiptTotal?: number; discrepancyNote?: string },
  ) {
    return this.prisma.supplierInvoice.create({
      data: {
        businessId,
        supplierId: dto.supplierId,
        receiptId: dto.receiptId,
        cfdiUuid: dto.cfdiUuid,
        cfdiXml: dto.cfdiXml,
        totalAmount: dto.totalAmount,
        receiptTotal: dto.receiptTotal,
        discrepancyNote: dto.discrepancyNote,
        currency: dto.currency ?? 'MXN',
        invoiceDate: new Date(dto.invoiceDate),
      },
      include: invoiceInclude,
    });
  }

  update(invoiceId: string, dto: UpdateSupplierInvoiceDto) {
    return this.prisma.supplierInvoice.update({
      where: { id: invoiceId },
      data: dto,
      include: invoiceInclude,
    });
  }

  updateStatus(invoiceId: string, status: string, extra?: Record<string, any>) {
    return this.prisma.supplierInvoice.update({
      where: { id: invoiceId },
      data: { status: status as any, ...extra },
      include: invoiceInclude,
    });
  }
}
