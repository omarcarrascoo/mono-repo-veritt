import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SupplierInvoicesRepository } from './supplier-invoices.repository';
import { CreateSupplierInvoiceDto } from './dto/create-supplier-invoice.dto';
import { UpdateSupplierInvoiceDto } from './dto/update-supplier-invoice.dto';
import { DeleteSupplierInvoiceDto } from './dto/delete-supplier-invoice.dto';
import { DisputeSupplierInvoiceDto } from './dto/dispute-supplier-invoice.dto';

const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => {
  if (value === null || value === undefined) return 0;
  return Number(value);
};
const round4 = (value: number) => Number(value.toFixed(4));

@Injectable()
export class SupplierInvoicesService {
  constructor(private readonly invoicesRepository: SupplierInvoicesRepository) {}

  private async ensureManagementAccess(businessId: string, userId: string) {
    const membership = await this.invoicesRepository.findMembership(businessId, userId);
    if (!membership || !['OWNER', 'ADMIN', 'VERITT_STAFF'].includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return membership;
  }

  async create(businessId: string, userId: string, dto: CreateSupplierInvoiceDto) {
    await this.ensureManagementAccess(businessId, userId);

    // Validate supplier
    const supplier = await this.invoicesRepository.findSupplier(dto.supplierId);
    if (!supplier || supplier.businessId !== businessId) {
      throw new NotFoundException('Supplier not found in this business');
    }

    // Validate receipt and auto-calculate receipt total if provided
    let receiptTotal: number | undefined;
    if (dto.receiptId) {
      const receipt = await this.invoicesRepository.findReceiptWithItems(dto.receiptId);
      if (!receipt || receipt.businessId !== businessId) {
        throw new NotFoundException('Receipt not found in this business');
      }
      if (receipt.status === 'CANCELLED') {
        throw new BadRequestException('Cannot link to a cancelled receipt');
      }
      receiptTotal = round4(
        receipt.items.reduce(
          (sum, item) => sum + toNumber(item.quantityReceived) * toNumber(item.actualUnitCost),
          0,
        ),
      );
    }

    return this.invoicesRepository.create(businessId, {
      ...dto,
      receiptTotal,
      discrepancyNote: dto.discrepancyNote,
    });
  }

  async findAll(businessId: string, userId: string, filters: { supplierId?: string; status?: string }) {
    await this.ensureManagementAccess(businessId, userId);
    return this.invoicesRepository.findAll(businessId, filters);
  }

  async findOne(businessId: string, invoiceId: string, userId: string) {
    await this.ensureManagementAccess(businessId, userId);
    const invoice = await this.invoicesRepository.findOne(invoiceId);
    if (!invoice || invoice.businessId !== businessId) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async update(businessId: string, invoiceId: string, userId: string, dto: UpdateSupplierInvoiceDto) {
    await this.ensureManagementAccess(businessId, userId);
    const invoice = await this.invoicesRepository.findOne(invoiceId);
    if (!invoice || invoice.businessId !== businessId) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status === 'DELETED') {
      throw new BadRequestException('Cannot update a deleted invoice');
    }
    return this.invoicesRepository.update(invoiceId, dto);
  }

  async verify(businessId: string, invoiceId: string, userId: string) {
    await this.ensureManagementAccess(businessId, userId);
    const invoice = await this.invoicesRepository.findOne(invoiceId);
    if (!invoice || invoice.businessId !== businessId) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status !== 'PENDING' && invoice.status !== 'DISPUTED') {
      throw new BadRequestException('Only pending or disputed invoices can be verified');
    }
    return this.invoicesRepository.updateStatus(invoiceId, 'VERIFIED', {
      verifiedByUserId: userId,
      verifiedAt: new Date(),
    });
  }

  async dispute(businessId: string, invoiceId: string, userId: string, dto: DisputeSupplierInvoiceDto) {
    await this.ensureManagementAccess(businessId, userId);
    const invoice = await this.invoicesRepository.findOne(invoiceId);
    if (!invoice || invoice.businessId !== businessId) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status !== 'PENDING' && invoice.status !== 'VERIFIED') {
      throw new BadRequestException('Only pending or verified invoices can be disputed');
    }
    return this.invoicesRepository.updateStatus(invoiceId, 'DISPUTED', {
      discrepancyNote: dto.reason,
    });
  }

  async softDelete(businessId: string, invoiceId: string, userId: string, dto: DeleteSupplierInvoiceDto) {
    await this.ensureManagementAccess(businessId, userId);
    const invoice = await this.invoicesRepository.findOne(invoiceId);
    if (!invoice || invoice.businessId !== businessId) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.status === 'DELETED') {
      throw new BadRequestException('Invoice is already deleted');
    }
    return this.invoicesRepository.updateStatus(invoiceId, 'DELETED', {
      deletedByUserId: userId,
      deletedAt: new Date(),
      deletionReason: dto.reason,
    });
  }

  async getReceiptTotal(businessId: string, receiptId: string, userId: string) {
    await this.ensureManagementAccess(businessId, userId);
    const receipt = await this.invoicesRepository.findReceiptWithItems(receiptId);
    if (!receipt || receipt.businessId !== businessId) {
      throw new NotFoundException('Receipt not found');
    }
    const total = round4(
      receipt.items.reduce(
        (sum, item) => sum + toNumber(item.quantityReceived) * toNumber(item.actualUnitCost),
        0,
      ),
    );
    return { receiptId, total };
  }
}
