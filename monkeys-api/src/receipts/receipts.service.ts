import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReceiptsRepository } from './receipts.repository';
import { NotificationsService } from '../notifications/notifications.service';
import { DailyChainService } from '../daily-chain/daily-chain.service';
import { LotCostingService } from '../inventory/lot-costing.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { CancelReceiptDto } from './dto/cancel-receipt.dto';

type Tx = Prisma.TransactionClient;

const round4 = (value: number) => Number(value.toFixed(4));
const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => {
  if (value === null || value === undefined) return 0;
  return Number(value);
};

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly receiptsRepository: ReceiptsRepository,
    private readonly notificationsService: NotificationsService,
    private readonly dailyChainService: DailyChainService,
    private readonly lotCosting: LotCostingService,
  ) {}

  private readonly MANAGER_ROLES = ['OWNER', 'ADMIN', 'VERITT_STAFF'];

  private async ensureBusinessAccess(businessId: string, userId: string) {
    const membership = await this.receiptsRepository.findMembership(businessId, userId);
    if (!membership) {
      throw new ForbiddenException('You do not belong to this business');
    }
    return membership;
  }

  private async ensureManagementAccess(businessId: string, userId: string) {
    const membership = await this.ensureBusinessAccess(businessId, userId);
    if (!this.MANAGER_ROLES.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return membership;
  }

  private async validateReceiptContext(
    businessId: string,
    userId: string,
    dto: CreateReceiptDto,
  ) {
    const dayOpen = await this.dailyChainService.isDayOpen(businessId);
    if (!dayOpen) {
      throw new BadRequestException(
        'El día operativo no está abierto. Autoriza la apertura (FAI) primero.',
      );
    }

    const location = await this.receiptsRepository.findLocation(dto.locationId);
    if (!location || location.businessId !== businessId) {
      throw new NotFoundException('Location not found in this business');
    }

    let po: Awaited<ReturnType<typeof this.receiptsRepository.findPurchaseOrder>> | null = null;
    if (dto.purchaseOrderId) {
      po = await this.receiptsRepository.findPurchaseOrder(dto.purchaseOrderId);
      if (!po || po.businessId !== businessId) {
        throw new NotFoundException('Purchase order not found');
      }
      if (!['SENT', 'PARTIALLY_RECEIVED'].includes(po.status)) {
        throw new BadRequestException('Purchase order is not in a receivable status');
      }
      if (po.createdByUserId === userId) {
        throw new ForbiddenException(
          'The person receiving cannot be the same person who created the purchase order',
        );
      }
    }

    for (const item of dto.items) {
      const material = await this.receiptsRepository.findMaterial(item.materialId);
      if (!material || material.businessId !== businessId) {
        throw new NotFoundException(`Material not found: ${item.materialId}`);
      }
    }

    return { po };
  }

  async create(businessId: string, userId: string, dto: CreateReceiptDto) {
    const membership = await this.ensureBusinessAccess(businessId, userId);
    const isManager = this.MANAGER_ROLES.includes(membership.role);

    // OPERATOR/SUPERVISOR: crea borrador que requiere autorización.
    if (!isManager) {
      return this.createDraft(businessId, userId, dto);
    }

    const { po } = await this.validateReceiptContext(businessId, userId, dto);

    // Execute transaction
    const result = await this.receiptsRepository.prismaClient.$transaction(async (tx: Tx) => {
      // Create receipt
      const receipt = await tx.receipt.create({
        data: {
          businessId,
          purchaseOrderId: dto.purchaseOrderId,
          receivedByUserId: userId,
          locationId: dto.locationId,
          notes: dto.notes,
          status: 'COMPLETED',
          authorizedByUserId: userId,
          authorizedAt: new Date(),
        },
      });

      // Process each item: create lot + movement + update stock
      for (const item of dto.items) {
        const totalCost = round4(item.quantityReceived * item.actualUnitCost);

        // Get current location balance for material
        const balanceAgg = await tx.materialStockMovement.aggregate({
          where: { materialId: item.materialId, locationId: dto.locationId },
          _sum: { quantityDelta: true },
        });
        const currentBalance = toNumber(balanceAgg._sum.quantityDelta);

        // Create material lot
        const lot = await tx.materialLot.create({
          data: {
            businessId,
            materialId: item.materialId,
            locationId: dto.locationId,
            sourceType: 'PURCHASE',
            originalQuantity: item.quantityReceived,
            remainingQuantity: item.quantityReceived,
            unitCost: item.actualUnitCost,
            totalCost,
            currency: 'MXN',
            referenceType: 'Receipt',
            referenceId: receipt.id,
            createdByUserId: userId,
          },
        });

        // Create stock movement
        await tx.materialStockMovement.create({
          data: {
            businessId,
            materialId: item.materialId,
            locationId: dto.locationId,
            lotId: lot.id,
            type: 'RECEIPT',
            quantityDelta: item.quantityReceived,
            balanceAfter: round4(currentBalance + item.quantityReceived),
            unitCostSnapshot: item.actualUnitCost,
            totalCostSnapshot: totalCost,
            currency: 'MXN',
            referenceType: 'Receipt',
            referenceId: receipt.id,
            createdByUserId: userId,
          },
        });

        // Update material stock and reference cost
        await tx.material.update({
          where: { id: item.materialId },
          data: { currentStock: { increment: item.quantityReceived } },
        });

        // Update receipt item with lot reference
        await tx.receiptItem.create({
          data: {
            receiptId: receipt.id,
            materialId: item.materialId,
            quantityReceived: item.quantityReceived,
            actualUnitCost: item.actualUnitCost,
            lotId: lot.id,
          },
        });

        // Recalcula promedio ponderado del material
        // (INVENTORY_COSTING.md 6.6 — fuente unica).
        await this.lotCosting.refreshReferenceCost(item.materialId, tx);
      }

      // Update PO status if linked
      if (po && dto.purchaseOrderId) {
        // Check if all PO items are fully received
        const allReceipts = await tx.receipt.findMany({
          where: { purchaseOrderId: dto.purchaseOrderId, status: 'COMPLETED' },
          include: { items: true },
        });

        const receivedByMaterial = new Map<string, number>();
        for (const r of allReceipts) {
          for (const ri of r.items) {
            const prev = receivedByMaterial.get(ri.materialId) ?? 0;
            receivedByMaterial.set(ri.materialId, prev + toNumber(ri.quantityReceived));
          }
        }

        const allFullyReceived = po.items.every((poItem) => {
          const received = receivedByMaterial.get(poItem.materialId) ?? 0;
          return received >= toNumber(poItem.quantityOrdered);
        });

        await tx.purchaseOrder.update({
          where: { id: dto.purchaseOrderId },
          data: { status: allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
        });
      }

      return receipt;
    });

    // Post-transaction: price alerts (non-blocking)
    for (const item of dto.items) {
      const material = await this.receiptsRepository.findMaterial(item.materialId);
      if (material) {
        const prevCost = toNumber(material.currentReferenceUnitCost);
        if (prevCost > 0) {
          const increase = (item.actualUnitCost - prevCost) / prevCost;
          if (increase > 0.1) {
            // >10% price increase
            await this.notificationsService.upsertNotification({
              businessId,
              type: 'MATERIAL_LOW_STOCK', // Closest available type
              dedupeKey: `price-alert-${material.id}-${new Date().toISOString().split('T')[0]}`,
              title: `Alerta de precio: ${material.name}`,
              body: `El costo de ${material.name} subió ${(increase * 100).toFixed(1)}% (de $${prevCost.toFixed(2)} a $${item.actualUnitCost.toFixed(2)})`,
              resourceType: 'Material',
              resourceId: material.id,
              metadataJson: {
                previousCost: prevCost,
                newCost: item.actualUnitCost,
                increasePercent: round4(increase * 100),
              },
            });
          }
        }
      }
    }

    return this.receiptsRepository.findOne(result.id);
  }

  /**
   * OPERATOR/SUPERVISOR crean un receipt en PENDING_REVIEW: guarda los ítems pero
   * NO mueve inventario ni cambia el PO. Se queda pendiente de autorización.
   */
  async createDraft(businessId: string, userId: string, dto: CreateReceiptDto) {
    await this.ensureBusinessAccess(businessId, userId);
    await this.validateReceiptContext(businessId, userId, dto);

    const receipt = await this.receiptsRepository.prismaClient.$transaction(async (tx: Tx) => {
      const created = await tx.receipt.create({
        data: {
          businessId,
          purchaseOrderId: dto.purchaseOrderId,
          receivedByUserId: userId,
          locationId: dto.locationId,
          notes: dto.notes,
          status: 'PENDING_REVIEW',
        },
      });

      for (const item of dto.items) {
        await tx.receiptItem.create({
          data: {
            receiptId: created.id,
            materialId: item.materialId,
            quantityReceived: item.quantityReceived,
            actualUnitCost: item.actualUnitCost,
            lotId: null,
          },
        });
      }

      return created;
    });

    return this.receiptsRepository.findOne(receipt.id);
  }

  /**
   * MANAGER autoriza un borrador: ejecuta los movimientos de inventario
   * (crear lotes, stock movements, actualizar costos, cerrar PO si aplica).
   */
  async authorize(businessId: string, receiptId: string, userId: string) {
    await this.ensureManagementAccess(businessId, userId);

    const receipt = await this.receiptsRepository.findOne(receiptId);
    if (!receipt || receipt.businessId !== businessId) {
      throw new NotFoundException('Receipt not found');
    }
    if (receipt.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Only pending receipts can be authorized');
    }
    if (receipt.receivedByUserId === userId) {
      throw new ForbiddenException(
        'No puedes autorizar una recepción que tú mismo registraste',
      );
    }

    const dayOpen = await this.dailyChainService.isDayOpen(businessId);
    if (!dayOpen) {
      throw new BadRequestException(
        'El día operativo no está abierto. Autoriza la apertura (FAI) primero.',
      );
    }

    let po: Awaited<ReturnType<typeof this.receiptsRepository.findPurchaseOrder>> | null = null;
    if (receipt.purchaseOrderId) {
      po = await this.receiptsRepository.findPurchaseOrder(receipt.purchaseOrderId);
      if (!po) {
        throw new NotFoundException('Purchase order not found');
      }
    }

    await this.receiptsRepository.prismaClient.$transaction(async (tx: Tx) => {
      for (const item of receipt.items) {
        const qty = toNumber(item.quantityReceived);
        const unitCost = toNumber(item.actualUnitCost);
        const totalCost = round4(qty * unitCost);

        const balanceAgg = await tx.materialStockMovement.aggregate({
          where: { materialId: item.materialId, locationId: receipt.locationId },
          _sum: { quantityDelta: true },
        });
        const currentBalance = toNumber(balanceAgg._sum.quantityDelta);

        const lot = await tx.materialLot.create({
          data: {
            businessId,
            materialId: item.materialId,
            locationId: receipt.locationId,
            sourceType: 'PURCHASE',
            originalQuantity: qty,
            remainingQuantity: qty,
            unitCost,
            totalCost,
            currency: 'MXN',
            referenceType: 'Receipt',
            referenceId: receipt.id,
            createdByUserId: userId,
          },
        });

        await tx.materialStockMovement.create({
          data: {
            businessId,
            materialId: item.materialId,
            locationId: receipt.locationId,
            lotId: lot.id,
            type: 'RECEIPT',
            quantityDelta: qty,
            balanceAfter: round4(currentBalance + qty),
            unitCostSnapshot: unitCost,
            totalCostSnapshot: totalCost,
            currency: 'MXN',
            referenceType: 'Receipt',
            referenceId: receipt.id,
            createdByUserId: userId,
          },
        });

        await tx.material.update({
          where: { id: item.materialId },
          data: { currentStock: { increment: qty } },
        });

        await tx.receiptItem.update({
          where: { id: item.id },
          data: { lotId: lot.id },
        });

        // Recalcula promedio ponderado del material
        // (INVENTORY_COSTING.md 6.6 — fuente unica).
        await this.lotCosting.refreshReferenceCost(item.materialId, tx);
      }

      await tx.receipt.update({
        where: { id: receipt.id },
        data: {
          status: 'COMPLETED',
          authorizedByUserId: userId,
          authorizedAt: new Date(),
        },
      });

      if (po && receipt.purchaseOrderId) {
        const allReceipts = await tx.receipt.findMany({
          where: { purchaseOrderId: receipt.purchaseOrderId, status: 'COMPLETED' },
          include: { items: true },
        });

        const receivedByMaterial = new Map<string, number>();
        for (const r of allReceipts) {
          for (const ri of r.items) {
            const prev = receivedByMaterial.get(ri.materialId) ?? 0;
            receivedByMaterial.set(ri.materialId, prev + toNumber(ri.quantityReceived));
          }
        }

        const allFullyReceived = po.items.every((poItem) => {
          const received = receivedByMaterial.get(poItem.materialId) ?? 0;
          return received >= toNumber(poItem.quantityOrdered);
        });

        await tx.purchaseOrder.update({
          where: { id: receipt.purchaseOrderId },
          data: { status: allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
        });
      }
    });

    return this.receiptsRepository.findOne(receipt.id);
  }

  /**
   * MANAGER rechaza un borrador: marca como REJECTED sin mover inventario.
   */
  async reject(businessId: string, receiptId: string, userId: string, reason: string) {
    await this.ensureManagementAccess(businessId, userId);

    const receipt = await this.receiptsRepository.findOne(receiptId);
    if (!receipt || receipt.businessId !== businessId) {
      throw new NotFoundException('Receipt not found');
    }
    if (receipt.status !== 'PENDING_REVIEW') {
      throw new BadRequestException('Only pending receipts can be rejected');
    }

    await this.receiptsRepository.update(receipt.id, {
      status: 'REJECTED',
      rejectedBy: { connect: { id: userId } },
      rejectedAt: new Date(),
      rejectionReason: reason,
    });

    return this.receiptsRepository.findOne(receipt.id);
  }

  async findAll(
    businessId: string,
    userId: string,
    filters: { purchaseOrderId?: string; from?: string; to?: string },
  ) {
    await this.ensureBusinessAccess(businessId, userId);

    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    if (filters.from) {
      fromDate = new Date(filters.from);
      fromDate.setUTCHours(0, 0, 0, 0);
    }
    if (filters.to) {
      toDate = new Date(filters.to);
      toDate.setUTCHours(23, 59, 59, 999);
    }

    return this.receiptsRepository.findAll(businessId, {
      purchaseOrderId: filters.purchaseOrderId,
      from: fromDate,
      to: toDate,
    });
  }

  async findOne(businessId: string, receiptId: string, userId: string) {
    await this.ensureBusinessAccess(businessId, userId);
    const receipt = await this.receiptsRepository.findOne(receiptId);
    if (!receipt || receipt.businessId !== businessId) {
      throw new NotFoundException('Receipt not found');
    }
    return receipt;
  }

  async cancel(businessId: string, receiptId: string, userId: string, dto: CancelReceiptDto) {
    await this.ensureBusinessAccess(businessId, userId);
    const receipt = await this.receiptsRepository.findOne(receiptId);
    if (!receipt || receipt.businessId !== businessId) {
      throw new NotFoundException('Receipt not found');
    }
    if (receipt.status !== 'COMPLETED') {
      throw new BadRequestException('Only completed receipts can be cancelled');
    }

    await this.receiptsRepository.prismaClient.$transaction(async (tx: Tx) => {
      // Reverse inventory for each item
      for (const item of receipt.items) {
        const qty = toNumber(item.quantityReceived);
        const unitCost = toNumber(item.actualUnitCost);

        // Get current location balance for material
        const balanceAgg = await tx.materialStockMovement.aggregate({
          where: { materialId: item.materialId, locationId: receipt.locationId },
          _sum: { quantityDelta: true },
        });
        const currentBalance = toNumber(balanceAgg._sum.quantityDelta);

        // Create reversal stock movement (negative)
        await tx.materialStockMovement.create({
          data: {
            businessId,
            materialId: item.materialId,
            locationId: receipt.locationId,
            lotId: item.lotId,
            type: 'ADJUSTMENT_OUT',
            quantityDelta: round4(-qty),
            balanceAfter: round4(currentBalance - qty),
            unitCostSnapshot: unitCost,
            totalCostSnapshot: round4(qty * unitCost),
            currency: 'MXN',
            referenceType: 'Receipt',
            referenceId: receipt.id,
            note: `Cancelación de recepción: ${dto.reason}`,
            createdByUserId: userId,
          },
        });

        // Decrement material stock
        await tx.material.update({
          where: { id: item.materialId },
          data: { currentStock: { decrement: qty } },
        });

        // Zero out the lot that was created
        if (item.lotId) {
          await tx.materialLot.update({
            where: { id: item.lotId },
            data: { remainingQuantity: 0 },
          });
        }

        // Recalcula promedio ponderado del material
        // (INVENTORY_COSTING.md 6.6 — fuente unica).
        await this.lotCosting.refreshReferenceCost(item.materialId, tx);
      }

      // Update receipt status
      await tx.receipt.update({
        where: { id: receiptId },
        data: {
          status: 'CANCELLED',
          cancellationReason: dto.reason,
          cancellationComment: dto.comment,
          cancelledByUserId: userId,
          cancelledAt: new Date(),
        },
      });

      // Re-evaluate PO status if linked
      if (receipt.purchaseOrderId) {
        const completedReceipts = await tx.receipt.findMany({
          where: {
            purchaseOrderId: receipt.purchaseOrderId,
            status: 'COMPLETED',
            id: { not: receiptId },
          },
          include: { items: true },
        });

        const po = await tx.purchaseOrder.findUnique({
          where: { id: receipt.purchaseOrderId },
          include: { items: true },
        });

        if (po) {
          if (completedReceipts.length === 0) {
            // No more completed receipts — revert PO to SENT
            await tx.purchaseOrder.update({
              where: { id: receipt.purchaseOrderId },
              data: { status: 'SENT' },
            });
          } else {
            // Check if remaining receipts still cover all items
            const receivedByMaterial = new Map<string, number>();
            for (const r of completedReceipts) {
              for (const ri of r.items) {
                const prev = receivedByMaterial.get(ri.materialId) ?? 0;
                receivedByMaterial.set(ri.materialId, prev + toNumber(ri.quantityReceived));
              }
            }
            const allFullyReceived = po.items.every((poItem) => {
              const received = receivedByMaterial.get(poItem.materialId) ?? 0;
              return received >= toNumber(poItem.quantityOrdered);
            });
            await tx.purchaseOrder.update({
              where: { id: receipt.purchaseOrderId },
              data: { status: allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
            });
          }
        }
      }
    });

    return this.receiptsRepository.findOne(receiptId);
  }
}
