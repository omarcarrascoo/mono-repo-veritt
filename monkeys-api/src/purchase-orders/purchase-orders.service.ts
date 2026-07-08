import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PurchaseOrdersRepository } from './purchase-orders.repository';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

type Tx = Prisma.TransactionClient;

const round4 = (value: number) => Number(value.toFixed(4));

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly poRepository: PurchaseOrdersRepository) {}

  private async ensureManagementAccess(businessId: string, userId: string) {
    const membership = await this.poRepository.findMembership(businessId, userId);
    if (!membership || !['OWNER', 'ADMIN', 'VERITT_STAFF'].includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return membership;
  }

  async create(businessId: string, userId: string, dto: CreatePurchaseOrderDto) {
    await this.ensureManagementAccess(businessId, userId);

    // Validate supplier
    const supplier = await this.poRepository.findSupplier(dto.supplierId);
    if (!supplier || supplier.businessId !== businessId) {
      throw new NotFoundException('Supplier not found in this business');
    }

    // Validate materials
    for (const item of dto.items) {
      const material = await this.poRepository.findMaterial(item.materialId);
      if (!material || material.businessId !== businessId) {
        throw new NotFoundException(`Material not found: ${item.materialId}`);
      }
    }

    const totalEstimated = round4(
      dto.items.reduce((sum, i) => sum + i.quantityOrdered * i.estimatedUnitCost, 0),
    );

    const result = await this.poRepository.prismaClient.$transaction(async (tx: Tx) => {
      const orderNumber = await this.poRepository.getNextOrderNumber(tx, businessId);

      return tx.purchaseOrder.create({
        data: {
          businessId,
          supplierId: dto.supplierId,
          createdByUserId: userId,
          orderNumber,
          totalEstimated,
          currency: dto.currency ?? 'MXN',
          notes: dto.notes,
          items: {
            create: dto.items.map((i) => ({
              materialId: i.materialId,
              quantityOrdered: i.quantityOrdered,
              estimatedUnitCost: i.estimatedUnitCost,
              notes: i.notes,
            })),
          },
        },
      });
    });

    return this.poRepository.findOne(result.id);
  }

  async findAll(businessId: string, userId: string, filters: { status?: string; supplierId?: string }) {
    await this.ensureManagementAccess(businessId, userId);
    return this.poRepository.findAll(businessId, filters);
  }

  async findOne(businessId: string, poId: string, userId: string) {
    await this.ensureManagementAccess(businessId, userId);
    const po = await this.poRepository.findOne(poId);
    if (!po || po.businessId !== businessId) {
      throw new NotFoundException('Purchase order not found');
    }
    return po;
  }

  async update(businessId: string, poId: string, userId: string, dto: UpdatePurchaseOrderDto) {
    await this.ensureManagementAccess(businessId, userId);
    const po = await this.poRepository.findOne(poId);
    if (!po || po.businessId !== businessId) {
      throw new NotFoundException('Purchase order not found');
    }
    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Only draft purchase orders can be updated');
    }
    return this.poRepository.update(poId, dto);
  }

  async send(businessId: string, poId: string, userId: string) {
    await this.ensureManagementAccess(businessId, userId);
    const po = await this.poRepository.findOne(poId);
    if (!po || po.businessId !== businessId) {
      throw new NotFoundException('Purchase order not found');
    }
    if (po.status !== 'DRAFT') {
      throw new BadRequestException('Only draft purchase orders can be sent');
    }
    return this.poRepository.updateStatus(poId, 'SENT', { sentAt: new Date() });
  }

  async cancel(businessId: string, poId: string, userId: string) {
    await this.ensureManagementAccess(businessId, userId);
    const po = await this.poRepository.findOne(poId);
    if (!po || po.businessId !== businessId) {
      throw new NotFoundException('Purchase order not found');
    }
    if (!['DRAFT', 'SENT'].includes(po.status)) {
      throw new BadRequestException('Cannot cancel a purchase order that has been received');
    }
    return this.poRepository.updateStatus(poId, 'CANCELLED');
  }
}
