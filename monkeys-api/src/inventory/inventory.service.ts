import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryLotSourceType,
  InventoryMovementType,
  NotificationType,
  Prisma,
  ProductType,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateInventoryLocationDto,
  UpdateInventoryLocationDto,
} from './dto/location.dto';
import {
  AdjustMaterialStockDto,
  CreateMaterialDto,
  InventoryAdjustmentDirectionDto,
  ReceiveMaterialLotDto,
  TransferMaterialStockDto,
  UpdateMaterialDto,
} from './dto/material.dto';
import {
  AddProductManualCostDto,
  AddProductPriceDto,
  AdjustProductStockDto,
  CreateProductDto,
  CreateProductRecipeVersionDto,
  CreateProductionBatchDto,
  ProductCostBreakdownDto,
  ReceiveProductLotDto,
  TransferProductStockDto,
  UpdateProductDto,
} from './dto/product.dto';

type Tx = Prisma.TransactionClient;

type CostBreakdown = {
  materialCost: number;
  directLaborCost: number;
  allocatedCifCost: number;
  totalCost: number;
};

type MaterialLayer = {
  lotId?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

type ProductLayer = {
  lotId?: string;
  quantity: number;
  materialCost: number;
  directLaborCost: number;
  allocatedCifCost: number;
  totalUnitCost: number;
  totalCost: number;
};

const round4 = (value: number) => Number(value.toFixed(4));

const toNumber = (
  value: Prisma.Decimal | number | string | null | undefined,
) => {
  if (value === null || value === undefined) return 0;
  return Number(value);
};

const toDate = (value?: string) => (value ? new Date(value) : new Date());

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async ensureBusinessAccess(businessId: string, userId: string) {
    const membership = await this.prisma.businessMembership.findFirst({
      where: { businessId, userId, status: 'ACTIVE' },
    });

    if (!membership) {
      throw new ForbiddenException('You do not belong to this business');
    }

    return membership;
  }

  private async ensureManagementAccess(businessId: string, userId: string) {
    const membership = await this.ensureBusinessAccess(businessId, userId);

    if (!['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return membership;
  }

  private async ensurePrimaryLocation(businessId: string) {
    const existingPrimary = await this.prisma.inventoryLocation.findFirst({
      where: { businessId, isPrimary: true },
    });

    if (existingPrimary) {
      return existingPrimary;
    }

    const firstLocation = await this.prisma.inventoryLocation.findFirst({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
    });

    if (firstLocation) {
      return this.prisma.inventoryLocation.update({
        where: { id: firstLocation.id },
        data: { isPrimary: true },
      });
    }

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return this.prisma.inventoryLocation.create({
      data: {
        businessId,
        name: business.name,
        type: 'MAIN',
        isPrimary: true,
      },
    });
  }

  private async resolveLocation(businessId: string, locationId?: string) {
    if (!locationId) {
      return this.ensurePrimaryLocation(businessId);
    }

    const location = await this.prisma.inventoryLocation.findFirst({
      where: {
        id: locationId,
        businessId,
      },
    });

    if (!location) {
      throw new NotFoundException('Inventory location not found');
    }

    if (location.status !== 'ACTIVE') {
      throw new BadRequestException('Inventory location is not active');
    }

    return location;
  }

  private async getBusinessCurrency(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { defaultCurrency: true },
    });

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    return business.defaultCurrency;
  }

  private ensureDirectProduct(type: ProductType) {
    if (type !== ProductType.DIRECT) {
      throw new BadRequestException(
        'This operation is only available for direct products',
      );
    }
  }

  private ensureRecipeProduct(type: ProductType) {
    if (type !== ProductType.RECIPE) {
      throw new BadRequestException(
        'This operation is only available for recipe products',
      );
    }
  }

  private normalizeCostBreakdown(
    input?: Partial<CostBreakdown>,
    fallback?: Partial<CostBreakdown>,
  ): CostBreakdown {
    const materialCost = input?.materialCost ?? fallback?.materialCost ?? 0;
    const directLaborCost =
      input?.directLaborCost ?? fallback?.directLaborCost ?? 0;
    const allocatedCifCost =
      input?.allocatedCifCost ?? fallback?.allocatedCifCost ?? 0;
    const rawTotal = materialCost + directLaborCost + allocatedCifCost;
    const totalCost = input?.totalCost ?? fallback?.totalCost ?? rawTotal;

    if (totalCost < 0) {
      throw new BadRequestException(
        'totalCost must be greater than or equal to zero',
      );
    }

    if (
      materialCost === 0 &&
      directLaborCost === 0 &&
      allocatedCifCost === 0 &&
      totalCost > 0
    ) {
      return {
        materialCost: round4(totalCost),
        directLaborCost: 0,
        allocatedCifCost: 0,
        totalCost: round4(totalCost),
      };
    }

    return {
      materialCost: round4(materialCost),
      directLaborCost: round4(directLaborCost),
      allocatedCifCost: round4(allocatedCifCost),
      totalCost: round4(totalCost),
    };
  }

  private async getMaterialOrThrow(
    businessId: string,
    materialId: string,
    tx: Tx | PrismaService = this.prisma,
  ) {
    const material = await tx.material.findFirst({
      where: { id: materialId, businessId },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return material;
  }

  private async getProductOrThrow(
    businessId: string,
    productId: string,
    tx: Tx | PrismaService = this.prisma,
  ) {
    const product = await tx.product.findFirst({
      where: { id: productId, businessId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async getMaterialLocationBalance(
    tx: Tx,
    materialId: string,
    locationId: string,
  ) {
    const aggregate = await tx.materialStockMovement.aggregate({
      where: { materialId, locationId },
      _sum: { quantityDelta: true },
    });

    return round4(toNumber(aggregate._sum.quantityDelta));
  }

  private async getProductLocationBalance(
    tx: Tx,
    productId: string,
    locationId: string,
  ) {
    const aggregate = await tx.productStockMovement.aggregate({
      where: { productId, locationId },
      _sum: { quantityDelta: true },
    });

    return round4(toNumber(aggregate._sum.quantityDelta));
  }

  private async refreshMaterialReferenceCost(tx: Tx, materialId: string) {
    const material = await tx.material.findUnique({
      where: { id: materialId },
      select: { currentReferenceUnitCost: true },
    });

    const openLots = await tx.materialLot.findMany({
      where: {
        materialId,
        remainingQuantity: {
          gt: 0,
        },
      },
      select: {
        remainingQuantity: true,
        unitCost: true,
      },
    });

    let totalQuantity = 0;
    let totalValue = 0;

    for (const lot of openLots) {
      const quantity = toNumber(lot.remainingQuantity);
      const unitCost = toNumber(lot.unitCost);
      totalQuantity += quantity;
      totalValue += quantity * unitCost;
    }

    if (totalQuantity <= 0) {
      return material?.currentReferenceUnitCost;
    }

    return tx.material.update({
      where: { id: materialId },
      data: {
        currentReferenceUnitCost: round4(totalValue / totalQuantity),
      },
    });
  }

  private async syncMaterialAlert(materialId: string) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
      select: {
        id: true,
        businessId: true,
        name: true,
        minStock: true,
        currentStock: true,
      },
    });

    if (!material) {
      return;
    }

    const currentStock = toNumber(material.currentStock);
    const minStock = toNumber(material.minStock);
    const lowKey = `${material.businessId}:material:${material.id}:low_stock`;
    const outKey = `${material.businessId}:material:${material.id}:out_of_stock`;

    if (currentStock <= 0) {
      await this.notificationsService.upsertNotification({
        businessId: material.businessId,
        type: NotificationType.MATERIAL_OUT_OF_STOCK,
        dedupeKey: outKey,
        title: 'Material out of stock',
        body: `${material.name} is out of stock`,
        resourceType: 'MATERIAL_STOCK',
        resourceId: material.id,
        metadataJson: {
          currentStock,
          minStock,
        },
      });
      await this.notificationsService.resolveNotifications(
        'MATERIAL_STOCK_LOW',
        material.id,
      );
      return;
    }

    if (minStock > 0 && currentStock <= minStock) {
      await this.notificationsService.upsertNotification({
        businessId: material.businessId,
        type: NotificationType.MATERIAL_LOW_STOCK,
        dedupeKey: lowKey,
        title: 'Material low stock',
        body: `${material.name} is below its minimum stock`,
        resourceType: 'MATERIAL_STOCK_LOW',
        resourceId: material.id,
        metadataJson: {
          currentStock,
          minStock,
        },
      });
      await this.notificationsService.resolveNotifications(
        'MATERIAL_STOCK',
        material.id,
      );
      return;
    }

    await this.notificationsService.resolveNotifications(
      'MATERIAL_STOCK',
      material.id,
    );
    await this.notificationsService.resolveNotifications(
      'MATERIAL_STOCK_LOW',
      material.id,
    );
  }

  private async syncProductAlert(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        businessId: true,
        name: true,
        minStock: true,
        currentStock: true,
      },
    });

    if (!product) {
      return;
    }

    const currentStock = toNumber(product.currentStock);
    const minStock = toNumber(product.minStock);
    const lowKey = `${product.businessId}:product:${product.id}:low_stock`;
    const outKey = `${product.businessId}:product:${product.id}:out_of_stock`;

    if (currentStock <= 0) {
      await this.notificationsService.upsertNotification({
        businessId: product.businessId,
        type: NotificationType.PRODUCT_OUT_OF_STOCK,
        dedupeKey: outKey,
        title: 'Product out of stock',
        body: `${product.name} is out of stock`,
        resourceType: 'PRODUCT_STOCK',
        resourceId: product.id,
        metadataJson: {
          currentStock,
          minStock,
        },
      });
      await this.notificationsService.resolveNotifications(
        'PRODUCT_STOCK_LOW',
        product.id,
      );
      return;
    }

    if (minStock > 0 && currentStock <= minStock) {
      await this.notificationsService.upsertNotification({
        businessId: product.businessId,
        type: NotificationType.PRODUCT_LOW_STOCK,
        dedupeKey: lowKey,
        title: 'Product low stock',
        body: `${product.name} is below its minimum stock`,
        resourceType: 'PRODUCT_STOCK_LOW',
        resourceId: product.id,
        metadataJson: {
          currentStock,
          minStock,
        },
      });
      await this.notificationsService.resolveNotifications(
        'PRODUCT_STOCK',
        product.id,
      );
      return;
    }

    await this.notificationsService.resolveNotifications(
      'PRODUCT_STOCK',
      product.id,
    );
    await this.notificationsService.resolveNotifications(
      'PRODUCT_STOCK_LOW',
      product.id,
    );
  }

  private async createMaterialInboundLot(
    tx: Tx,
    input: {
      businessId: string;
      materialId: string;
      locationId: string;
      quantity: number;
      unitCost: number;
      currency: string;
      sourceType: InventoryLotSourceType;
      receivedAt?: Date;
      note?: string;
      lotCode?: string;
      referenceType?: string;
      referenceId?: string;
      createdByUserId?: string;
      expiresAt?: Date;
      movementType: InventoryMovementType;
    },
  ) {
    const currentLocationBalance = await this.getMaterialLocationBalance(
      tx,
      input.materialId,
      input.locationId,
    );
    const totalCost = round4(input.quantity * input.unitCost);

    const lot = await tx.materialLot.create({
      data: {
        businessId: input.businessId,
        materialId: input.materialId,
        locationId: input.locationId,
        sourceType: input.sourceType,
        lotCode: input.lotCode,
        originalQuantity: input.quantity,
        remainingQuantity: input.quantity,
        unitCost: input.unitCost,
        totalCost,
        currency: input.currency,
        receivedAt: input.receivedAt ?? new Date(),
        expiresAt: input.expiresAt,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        note: input.note,
        createdByUserId: input.createdByUserId,
      },
    });

    await tx.materialStockMovement.create({
      data: {
        businessId: input.businessId,
        materialId: input.materialId,
        locationId: input.locationId,
        lotId: lot.id,
        type: input.movementType,
        quantityDelta: input.quantity,
        balanceAfter: round4(currentLocationBalance + input.quantity),
        unitCostSnapshot: input.unitCost,
        totalCostSnapshot: totalCost,
        currency: input.currency,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        note: input.note,
        createdByUserId: input.createdByUserId,
      },
    });

    await tx.material.update({
      where: { id: input.materialId },
      data: {
        currentStock: {
          increment: input.quantity,
        },
      },
    });

    await this.refreshMaterialReferenceCost(tx, input.materialId);

    return lot;
  }

  private async consumeMaterialStock(
    tx: Tx,
    input: {
      businessId: string;
      materialId: string;
      locationId: string;
      quantity: number;
      currency: string;
      movementType: InventoryMovementType;
      note?: string;
      referenceType?: string;
      referenceId?: string;
      createdByUserId?: string;
    },
  ) {
    const material = await this.getMaterialOrThrow(
      input.businessId,
      input.materialId,
      tx,
    );
    const openLots = await tx.materialLot.findMany({
      where: {
        materialId: input.materialId,
        locationId: input.locationId,
        remainingQuantity: {
          gt: 0,
        },
      },
      orderBy: [{ receivedAt: 'asc' }, { createdAt: 'asc' }],
    });

    const layers: MaterialLayer[] = [];
    let remaining = input.quantity;

    for (const lot of openLots) {
      if (remaining <= 0) break;
      const available = toNumber(lot.remainingQuantity);
      const take = round4(Math.min(available, remaining));

      if (take <= 0) continue;

      await tx.materialLot.update({
        where: { id: lot.id },
        data: {
          remainingQuantity: round4(available - take),
        },
      });

      layers.push({
        lotId: lot.id,
        quantity: take,
        unitCost: toNumber(lot.unitCost),
        totalCost: round4(take * toNumber(lot.unitCost)),
      });

      remaining = round4(remaining - take);
    }

    const fallbackUnitCost = toNumber(material.currentReferenceUnitCost);

    if (remaining > 0) {
      layers.push({
        quantity: remaining,
        unitCost: fallbackUnitCost,
        totalCost: round4(remaining * fallbackUnitCost),
      });
    }

    const totalCost = round4(
      layers.reduce((sum, layer) => sum + layer.totalCost, 0),
    );
    const unitCostSnapshot =
      input.quantity > 0
        ? round4(totalCost / input.quantity)
        : fallbackUnitCost;
    const currentLocationBalance = await this.getMaterialLocationBalance(
      tx,
      input.materialId,
      input.locationId,
    );
    const newLocationBalance = round4(currentLocationBalance - input.quantity);

    const movement = await tx.materialStockMovement.create({
      data: {
        businessId: input.businessId,
        materialId: input.materialId,
        locationId: input.locationId,
        type: input.movementType,
        quantityDelta: -input.quantity,
        balanceAfter: newLocationBalance,
        unitCostSnapshot,
        totalCostSnapshot: totalCost,
        currency: input.currency,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        note: input.note,
        createdByUserId: input.createdByUserId,
      },
    });

    if (layers.length > 0) {
      await tx.materialLotAllocation.createMany({
        data: layers
          .filter((layer) => layer.lotId)
          .map((layer) => ({
            businessId: input.businessId,
            materialId: input.materialId,
            lotId: layer.lotId!,
            movementId: movement.id,
            quantity: layer.quantity,
            unitCostSnapshot: layer.unitCost,
            totalCostSnapshot: layer.totalCost,
          })),
      });
    }

    await tx.material.update({
      where: { id: input.materialId },
      data: {
        currentStock: {
          decrement: input.quantity,
        },
      },
    });

    await this.refreshMaterialReferenceCost(tx, input.materialId);

    return {
      movement,
      layers,
      totalCost,
      unitCostSnapshot,
    };
  }

  private async createProductInboundLot(
    tx: Tx,
    input: {
      businessId: string;
      productId: string;
      locationId: string;
      quantity: number;
      currency: string;
      sourceType: InventoryLotSourceType;
      producedAt?: Date;
      note?: string;
      referenceType?: string;
      referenceId?: string;
      createdByUserId?: string;
      movementType: InventoryMovementType;
      costs: CostBreakdown;
    },
  ) {
    const currentLocationBalance = await this.getProductLocationBalance(
      tx,
      input.productId,
      input.locationId,
    );
    const lot = await tx.productLot.create({
      data: {
        businessId: input.businessId,
        productId: input.productId,
        locationId: input.locationId,
        sourceType: input.sourceType,
        originalQuantity: input.quantity,
        remainingQuantity: input.quantity,
        materialCost: input.costs.materialCost,
        directLaborCost: input.costs.directLaborCost,
        allocatedCifCost: input.costs.allocatedCifCost,
        totalUnitCost: input.costs.totalCost,
        totalLotCost: round4(input.quantity * input.costs.totalCost),
        currency: input.currency,
        producedAt: input.producedAt ?? new Date(),
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        note: input.note,
        createdByUserId: input.createdByUserId,
      },
    });

    await tx.productStockMovement.create({
      data: {
        businessId: input.businessId,
        productId: input.productId,
        locationId: input.locationId,
        lotId: lot.id,
        type: input.movementType,
        quantityDelta: input.quantity,
        balanceAfter: round4(currentLocationBalance + input.quantity),
        materialCostSnapshot: input.costs.materialCost,
        directLaborCostSnapshot: input.costs.directLaborCost,
        allocatedCifCostSnapshot: input.costs.allocatedCifCost,
        totalUnitCostSnapshot: input.costs.totalCost,
        totalCostSnapshot: round4(input.quantity * input.costs.totalCost),
        currency: input.currency,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        note: input.note,
        createdByUserId: input.createdByUserId,
      },
    });

    await tx.product.update({
      where: { id: input.productId },
      data: {
        currentStock: {
          increment: input.quantity,
        },
      },
    });

    return lot;
  }

  private async consumeProductStock(
    tx: Tx,
    input: {
      businessId: string;
      productId: string;
      locationId: string;
      quantity: number;
      currency: string;
      movementType: InventoryMovementType;
      note?: string;
      referenceType?: string;
      referenceId?: string;
      createdByUserId?: string;
    },
  ) {
    const product = await this.getProductOrThrow(
      input.businessId,
      input.productId,
      tx,
    );
    const openLots = await tx.productLot.findMany({
      where: {
        productId: input.productId,
        locationId: input.locationId,
        remainingQuantity: {
          gt: 0,
        },
      },
      orderBy: [{ producedAt: 'asc' }, { createdAt: 'asc' }],
    });

    const layers: ProductLayer[] = [];
    let remaining = input.quantity;

    for (const lot of openLots) {
      if (remaining <= 0) break;
      const available = toNumber(lot.remainingQuantity);
      const take = round4(Math.min(available, remaining));

      if (take <= 0) continue;

      await tx.productLot.update({
        where: { id: lot.id },
        data: {
          remainingQuantity: round4(available - take),
        },
      });

      layers.push({
        lotId: lot.id,
        quantity: take,
        materialCost: toNumber(lot.materialCost),
        directLaborCost: toNumber(lot.directLaborCost),
        allocatedCifCost: toNumber(lot.allocatedCifCost),
        totalUnitCost: toNumber(lot.totalUnitCost),
        totalCost: round4(take * toNumber(lot.totalUnitCost)),
      });

      remaining = round4(remaining - take);
    }

    const fallback = {
      materialCost: toNumber(product.currentMaterialCost),
      directLaborCost: toNumber(product.currentDirectLaborCost),
      allocatedCifCost: toNumber(product.currentAllocatedCifCost),
      totalCost: toNumber(product.currentCost),
    };

    if (remaining > 0) {
      layers.push({
        quantity: remaining,
        materialCost: fallback.materialCost,
        directLaborCost: fallback.directLaborCost,
        allocatedCifCost: fallback.allocatedCifCost,
        totalUnitCost: fallback.totalCost,
        totalCost: round4(remaining * fallback.totalCost),
      });
    }

    const totalCost = round4(
      layers.reduce((sum, layer) => sum + layer.totalCost, 0),
    );
    const totalMaterialCost = round4(
      layers.reduce(
        (sum, layer) => sum + layer.materialCost * layer.quantity,
        0,
      ),
    );
    const totalDirectLaborCost = round4(
      layers.reduce(
        (sum, layer) => sum + layer.directLaborCost * layer.quantity,
        0,
      ),
    );
    const totalAllocatedCifCost = round4(
      layers.reduce(
        (sum, layer) => sum + layer.allocatedCifCost * layer.quantity,
        0,
      ),
    );
    const currentLocationBalance = await this.getProductLocationBalance(
      tx,
      input.productId,
      input.locationId,
    );
    const movement = await tx.productStockMovement.create({
      data: {
        businessId: input.businessId,
        productId: input.productId,
        locationId: input.locationId,
        type: input.movementType,
        quantityDelta: -input.quantity,
        balanceAfter: round4(currentLocationBalance - input.quantity),
        materialCostSnapshot:
          input.quantity > 0 ? round4(totalMaterialCost / input.quantity) : 0,
        directLaborCostSnapshot:
          input.quantity > 0
            ? round4(totalDirectLaborCost / input.quantity)
            : 0,
        allocatedCifCostSnapshot:
          input.quantity > 0
            ? round4(totalAllocatedCifCost / input.quantity)
            : 0,
        totalUnitCostSnapshot:
          input.quantity > 0 ? round4(totalCost / input.quantity) : 0,
        totalCostSnapshot: totalCost,
        currency: input.currency,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        note: input.note,
        createdByUserId: input.createdByUserId,
      },
    });

    if (layers.length > 0) {
      await tx.productLotAllocation.createMany({
        data: layers
          .filter((layer) => layer.lotId)
          .map((layer) => ({
            businessId: input.businessId,
            productId: input.productId,
            lotId: layer.lotId!,
            movementId: movement.id,
            quantity: layer.quantity,
            materialCostSnapshot: layer.materialCost,
            directLaborCostSnapshot: layer.directLaborCost,
            allocatedCifCostSnapshot: layer.allocatedCifCost,
            totalUnitCostSnapshot: layer.totalUnitCost,
            totalCostSnapshot: layer.totalCost,
          })),
      });
    }

    await tx.product.update({
      where: { id: input.productId },
      data: {
        currentStock: {
          decrement: input.quantity,
        },
      },
    });

    return {
      movement,
      layers,
      totalCost,
    };
  }

  async listCategories(businessId: string, userId: string): Promise<string[]> {
    await this.ensureBusinessAccess(businessId, userId);

    const [materialCats, productCats] = await Promise.all([
      this.prisma.material.findMany({
        where: { businessId, category: { not: null } },
        select: { category: true },
        distinct: ['category'],
      }),
      this.prisma.product.findMany({
        where: { businessId, category: { not: null } },
        select: { category: true },
        distinct: ['category'],
      }),
    ]);

    const allCategories = new Set<string>();
    for (const m of materialCats) if (m.category) allCategories.add(m.category);
    for (const p of productCats) if (p.category) allCategories.add(p.category);

    return Array.from(allCategories).sort();
  }

  async listLocations(businessId: string, userId: string) {
    await this.ensureBusinessAccess(businessId, userId);
    await this.ensurePrimaryLocation(businessId);

    return this.prisma.inventoryLocation.findMany({
      where: { businessId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createLocation(
    businessId: string,
    userId: string,
    dto: CreateInventoryLocationDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);
    await this.ensurePrimaryLocation(businessId);

    return this.prisma.inventoryLocation.create({
      data: {
        businessId,
        name: dto.name,
        type: dto.type ?? 'OTHER',
      },
    });
  }

  async updateLocation(
    businessId: string,
    locationId: string,
    userId: string,
    dto: UpdateInventoryLocationDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);

    const location = await this.prisma.inventoryLocation.findFirst({
      where: { id: locationId, businessId },
    });

    if (!location) {
      throw new NotFoundException('Inventory location not found');
    }

    if (location.isPrimary && dto.status && dto.status !== 'ACTIVE') {
      throw new BadRequestException(
        'The primary business location must remain active',
      );
    }

    return this.prisma.inventoryLocation.update({
      where: { id: locationId },
      data: dto,
    });
  }

  async listMaterials(businessId: string, userId: string) {
    await this.ensureBusinessAccess(businessId, userId);

    return this.prisma.material.findMany({
      where: { businessId },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  }

  async getMaterial(businessId: string, materialId: string, userId: string) {
    await this.ensureBusinessAccess(businessId, userId);

    const material = await this.prisma.material.findFirst({
      where: { id: materialId, businessId },
      include: {
        lots: {
          where: {
            remainingQuantity: {
              gt: 0,
            },
          },
          orderBy: [{ receivedAt: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return material;
  }

  async createMaterial(
    businessId: string,
    userId: string,
    dto: CreateMaterialDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);

    if (dto.sku) {
      const existing = await this.prisma.material.findFirst({
        where: { businessId, sku: dto.sku },
      });
      if (existing) {
        throw new ConflictException(`El SKU "${dto.sku}" ya está en uso por otro insumo.`);
      }
    }

    const material = await this.prisma.material.create({
      data: {
        businessId,
        name: dto.name,
        baseUnit: dto.baseUnit,
        category: dto.category,
        sku: dto.sku,
        reorderFrequencyDays: dto.reorderFrequencyDays,
        minStock: dto.minStock ?? 0,
      },
    });

    await this.syncMaterialAlert(material.id);

    return material;
  }

  async updateMaterial(
    businessId: string,
    materialId: string,
    userId: string,
    dto: UpdateMaterialDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);
    await this.getMaterialOrThrow(businessId, materialId);

    const material = await this.prisma.material.update({
      where: { id: materialId },
      data: dto,
    });

    await this.syncMaterialAlert(material.id);

    return material;
  }

  async receiveMaterialLot(
    businessId: string,
    materialId: string,
    userId: string,
    dto: ReceiveMaterialLotDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);

    const [material, location, currency] = await Promise.all([
      this.getMaterialOrThrow(businessId, materialId),
      this.resolveLocation(businessId, dto.locationId),
      this.getBusinessCurrency(businessId),
    ]);

    const lot = await this.prisma.$transaction(async (tx) =>
      this.createMaterialInboundLot(tx, {
        businessId,
        materialId: material.id,
        locationId: location.id,
        quantity: round4(dto.quantity),
        unitCost: round4(dto.unitCost),
        currency,
        sourceType: InventoryLotSourceType.RECEIPT,
        receivedAt: toDate(dto.receivedAt),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        note: dto.note,
        lotCode: dto.lotCode,
        createdByUserId: userId,
        movementType: InventoryMovementType.RECEIPT,
      }),
    );

    await this.syncMaterialAlert(material.id);

    return lot;
  }

  async adjustMaterialStock(
    businessId: string,
    materialId: string,
    userId: string,
    dto: AdjustMaterialStockDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);

    const [material, location, currency] = await Promise.all([
      this.getMaterialOrThrow(businessId, materialId),
      this.resolveLocation(businessId, dto.locationId),
      this.getBusinessCurrency(businessId),
    ]);

    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.direction === InventoryAdjustmentDirectionDto.IN) {
        const unitCost = round4(
          dto.unitCost ?? toNumber(material.currentReferenceUnitCost),
        );
        return this.createMaterialInboundLot(tx, {
          businessId,
          materialId: material.id,
          locationId: location.id,
          quantity: round4(dto.quantity),
          unitCost,
          currency,
          sourceType: InventoryLotSourceType.ADJUSTMENT,
          note: dto.note,
          createdByUserId: userId,
          movementType: InventoryMovementType.ADJUSTMENT_IN,
        });
      }

      return this.consumeMaterialStock(tx, {
        businessId,
        materialId: material.id,
        locationId: location.id,
        quantity: round4(dto.quantity),
        currency,
        movementType: InventoryMovementType.ADJUSTMENT_OUT,
        note: dto.note,
        createdByUserId: userId,
      });
    });

    await this.syncMaterialAlert(material.id);

    return result;
  }

  async transferMaterialStock(
    businessId: string,
    materialId: string,
    userId: string,
    dto: TransferMaterialStockDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);

    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException(
        'Source and destination locations must be different',
      );
    }

    const [material, fromLocation, toLocation, currency] = await Promise.all([
      this.getMaterialOrThrow(businessId, materialId),
      this.resolveLocation(businessId, dto.fromLocationId),
      this.resolveLocation(businessId, dto.toLocationId),
      this.getBusinessCurrency(businessId),
    ]);

    const referenceId = randomUUID();

    const result = await this.prisma.$transaction(async (tx) => {
      const consumption = await this.consumeMaterialStock(tx, {
        businessId,
        materialId: material.id,
        locationId: fromLocation.id,
        quantity: round4(dto.quantity),
        currency,
        movementType: InventoryMovementType.TRANSFER_OUT,
        note: dto.note,
        referenceType: 'MATERIAL_TRANSFER',
        referenceId,
        createdByUserId: userId,
      });

      for (const layer of consumption.layers) {
        await this.createMaterialInboundLot(tx, {
          businessId,
          materialId: material.id,
          locationId: toLocation.id,
          quantity: layer.quantity,
          unitCost: layer.unitCost,
          currency,
          sourceType: InventoryLotSourceType.TRANSFER,
          note: dto.note,
          referenceType: 'MATERIAL_TRANSFER',
          referenceId,
          createdByUserId: userId,
          movementType: InventoryMovementType.TRANSFER_IN,
        });
      }

      await tx.material.update({
        where: { id: material.id },
        data: {
          currentStock: material.currentStock,
        },
      });

      return {
        referenceId,
        transferredQuantity: round4(dto.quantity),
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
      };
    });

    await this.syncMaterialAlert(material.id);

    return result;
  }

  async listProducts(businessId: string, userId: string) {
    await this.ensureBusinessAccess(businessId, userId);

    return this.prisma.product.findMany({
      where: { businessId },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });
  }

  async getProduct(businessId: string, productId: string, userId: string) {
    await this.ensureBusinessAccess(businessId, userId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
      include: {
        recipeVersions: {
          include: {
            items: true,
          },
          orderBy: [{ versionNumber: 'desc' }],
          take: 1,
        },
        lots: {
          where: {
            remainingQuantity: {
              gt: 0,
            },
          },
          orderBy: [{ producedAt: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async createProduct(
    businessId: string,
    userId: string,
    dto: CreateProductDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);

    const product = await this.prisma.product.create({
      data: {
        businessId,
        name: dto.name,
        type: dto.type,
        category: dto.category,
        stockUnit: dto.stockUnit ?? 'unit',
        estimatedDailySalesVolume: dto.estimatedDailySalesVolume,
        minStock: dto.minStock ?? 0,
      },
    });

    await this.syncProductAlert(product.id);

    return product;
  }

  async updateProduct(
    businessId: string,
    productId: string,
    userId: string,
    dto: UpdateProductDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);
    await this.getProductOrThrow(businessId, productId);

    const product = await this.prisma.product.update({
      where: { id: productId },
      data: dto,
    });

    await this.syncProductAlert(product.id);

    return product;
  }

  async addProductPrice(
    businessId: string,
    productId: string,
    userId: string,
    dto: AddProductPriceDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);
    await this.getProductOrThrow(businessId, productId);

    const currency = await this.getBusinessCurrency(businessId);

    return this.prisma.$transaction(async (tx) => {
      const history = await tx.productSalePriceHistory.create({
        data: {
          businessId,
          productId,
          price: round4(dto.price),
          currency,
          effectiveFrom: toDate(dto.effectiveFrom),
          createdByUserId: userId,
          changeReason: dto.changeReason,
        },
      });

      await tx.product.update({
        where: { id: productId },
        data: {
          currentSalePrice: round4(dto.price),
        },
      });

      return history;
    });
  }

  async addProductManualCost(
    businessId: string,
    productId: string,
    userId: string,
    dto: AddProductManualCostDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);
    const product = await this.getProductOrThrow(businessId, productId);
    this.ensureDirectProduct(product.type);

    const costs = this.normalizeCostBreakdown(dto);

    return this.prisma.$transaction(async (tx) => {
      const history = await tx.productManualCostHistory.create({
        data: {
          businessId,
          productId,
          materialCost: costs.materialCost,
          directLaborCost: costs.directLaborCost,
          allocatedCifCost: costs.allocatedCifCost,
          totalCost: costs.totalCost,
          effectiveFrom: toDate(dto.effectiveFrom),
          createdByUserId: userId,
          changeReason: dto.changeReason,
        },
      });

      await tx.product.update({
        where: { id: productId },
        data: {
          currentMaterialCost: costs.materialCost,
          currentDirectLaborCost: costs.directLaborCost,
          currentAllocatedCifCost: costs.allocatedCifCost,
          currentCost: costs.totalCost,
        },
      });

      return history;
    });
  }

  async createProductRecipeVersion(
    businessId: string,
    productId: string,
    userId: string,
    dto: CreateProductRecipeVersionDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);
    const product = await this.getProductOrThrow(businessId, productId);
    this.ensureRecipeProduct(product.type);

    const materialIds = [...new Set(dto.items.map((item) => item.materialId))];
    const materials = await this.prisma.material.findMany({
      where: {
        businessId,
        id: {
          in: materialIds,
        },
      },
    });

    if (materials.length !== materialIds.length) {
      throw new BadRequestException(
        'One or more recipe materials do not belong to this business',
      );
    }

    const materialMap = new Map(
      materials.map((material) => [material.id, material]),
    );
    let materialCost = 0;

    for (const item of dto.items) {
      const material = materialMap.get(item.materialId)!;
      const requiredQuantity = round4(
        item.quantity * (1 + (item.wastePercent ?? 0) / 100),
      );
      materialCost +=
        requiredQuantity * toNumber(material.currentReferenceUnitCost);
    }

    materialCost = round4(materialCost);
    const directLaborCost = round4(dto.directLaborCost ?? 0);
    const allocatedCifCost = round4(dto.allocatedCifCost ?? 0);
    const totalCost = round4(materialCost + directLaborCost + allocatedCifCost);

    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.productRecipeVersion.findFirst({
        where: { productId },
        orderBy: { versionNumber: 'desc' },
      });

      const recipeVersion = await tx.productRecipeVersion.create({
        data: {
          businessId,
          productId,
          versionNumber: (latest?.versionNumber ?? 0) + 1,
          effectiveFrom: toDate(dto.effectiveFrom),
          materialCost,
          directLaborCost,
          allocatedCifCost,
          totalCost,
          note: dto.note,
          createdByUserId: userId,
          items: {
            create: dto.items.map((item) => ({
              materialId: item.materialId,
              quantity: round4(item.quantity),
              wastePercent: round4(item.wastePercent ?? 0),
            })),
          },
        },
        include: {
          items: true,
        },
      });

      await tx.product.update({
        where: { id: productId },
        data: {
          currentMaterialCost: materialCost,
          currentDirectLaborCost: directLaborCost,
          currentAllocatedCifCost: allocatedCifCost,
          currentCost: totalCost,
        },
      });

      return recipeVersion;
    });
  }

  async receiveProductLot(
    businessId: string,
    productId: string,
    userId: string,
    dto: ReceiveProductLotDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);

    const [product, location, currency] = await Promise.all([
      this.getProductOrThrow(businessId, productId),
      this.resolveLocation(businessId, dto.locationId),
      this.getBusinessCurrency(businessId),
    ]);

    this.ensureDirectProduct(product.type);

    const costs = this.normalizeCostBreakdown(dto, {
      materialCost: toNumber(product.currentMaterialCost),
      directLaborCost: toNumber(product.currentDirectLaborCost),
      allocatedCifCost: toNumber(product.currentAllocatedCifCost),
      totalCost: toNumber(product.currentCost),
    });

    const lot = await this.prisma.$transaction(async (tx) => {
      const createdLot = await this.createProductInboundLot(tx, {
        businessId,
        productId: product.id,
        locationId: location.id,
        quantity: round4(dto.quantity),
        currency,
        sourceType: InventoryLotSourceType.RECEIPT,
        producedAt: toDate(dto.producedAt),
        note: dto.note,
        createdByUserId: userId,
        movementType: InventoryMovementType.RECEIPT,
        costs,
      });

      await tx.product.update({
        where: { id: product.id },
        data: {
          currentMaterialCost: costs.materialCost,
          currentDirectLaborCost: costs.directLaborCost,
          currentAllocatedCifCost: costs.allocatedCifCost,
          currentCost: costs.totalCost,
        },
      });

      return createdLot;
    });

    await this.syncProductAlert(product.id);

    return lot;
  }

  async createProductionBatch(
    businessId: string,
    productId: string,
    userId: string,
    dto: CreateProductionBatchDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);

    const [product, location, currency] = await Promise.all([
      this.getProductOrThrow(businessId, productId),
      this.resolveLocation(businessId, dto.locationId),
      this.getBusinessCurrency(businessId),
    ]);

    this.ensureRecipeProduct(product.type);

    const referenceId = randomUUID();

    const result = await this.prisma.$transaction(async (tx) => {
      const recipeVersion = dto.recipeVersionId
        ? await tx.productRecipeVersion.findFirst({
            where: { id: dto.recipeVersionId, businessId, productId },
            include: { items: true },
          })
        : await tx.productRecipeVersion.findFirst({
            where: {
              businessId,
              productId,
              effectiveFrom: {
                lte: toDate(dto.producedAt),
              },
            },
            include: { items: true },
            orderBy: [{ effectiveFrom: 'desc' }, { versionNumber: 'desc' }],
          });

      if (!recipeVersion) {
        throw new BadRequestException(
          'No active recipe version found for this product',
        );
      }

      let materialCostTotal = 0;

      for (const item of recipeVersion.items) {
        const requiredQuantity = round4(
          dto.quantity *
            toNumber(item.quantity) *
            (1 + toNumber(item.wastePercent) / 100),
        );

        const material = await this.getMaterialOrThrow(
          businessId,
          item.materialId,
          tx,
        );

        const consumption = await this.consumeMaterialStock(tx, {
          businessId,
          materialId: material.id,
          locationId: location.id,
          quantity: requiredQuantity,
          currency,
          movementType: InventoryMovementType.PRODUCTION_OUT,
          note: dto.note ?? `Consumed for production of ${product.name}`,
          referenceType: 'PRODUCT_PRODUCTION_BATCH',
          referenceId,
          createdByUserId: userId,
        });

        materialCostTotal += consumption.totalCost;
      }

      const unitCosts = this.normalizeCostBreakdown({
        materialCost:
          dto.quantity > 0 ? round4(materialCostTotal / dto.quantity) : 0,
        directLaborCost:
          dto.directLaborCost ?? toNumber(recipeVersion.directLaborCost),
        allocatedCifCost:
          dto.allocatedCifCost ?? toNumber(recipeVersion.allocatedCifCost),
      });

      const lot = await this.createProductInboundLot(tx, {
        businessId,
        productId: product.id,
        locationId: location.id,
        quantity: round4(dto.quantity),
        currency,
        sourceType: InventoryLotSourceType.PRODUCTION,
        producedAt: toDate(dto.producedAt),
        note: dto.note,
        referenceType: 'PRODUCT_PRODUCTION_BATCH',
        referenceId,
        createdByUserId: userId,
        movementType: InventoryMovementType.PRODUCTION_IN,
        costs: unitCosts,
      });

      return {
        referenceId,
        recipeVersionId: recipeVersion.id,
        lot,
      };
    });

    await this.syncProductAlert(product.id);

    return result;
  }

  async adjustProductStock(
    businessId: string,
    productId: string,
    userId: string,
    dto: AdjustProductStockDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);

    const [product, location, currency] = await Promise.all([
      this.getProductOrThrow(businessId, productId),
      this.resolveLocation(businessId, dto.locationId),
      this.getBusinessCurrency(businessId),
    ]);

    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.direction === InventoryAdjustmentDirectionDto.IN) {
        const costs = this.normalizeCostBreakdown(dto, {
          materialCost: toNumber(product.currentMaterialCost),
          directLaborCost: toNumber(product.currentDirectLaborCost),
          allocatedCifCost: toNumber(product.currentAllocatedCifCost),
          totalCost: toNumber(product.currentCost),
        });

        return this.createProductInboundLot(tx, {
          businessId,
          productId: product.id,
          locationId: location.id,
          quantity: round4(dto.quantity),
          currency,
          sourceType: InventoryLotSourceType.ADJUSTMENT,
          note: dto.note,
          createdByUserId: userId,
          movementType: InventoryMovementType.ADJUSTMENT_IN,
          costs,
        });
      }

      return this.consumeProductStock(tx, {
        businessId,
        productId: product.id,
        locationId: location.id,
        quantity: round4(dto.quantity),
        currency,
        movementType: InventoryMovementType.ADJUSTMENT_OUT,
        note: dto.note,
        createdByUserId: userId,
      });
    });

    await this.syncProductAlert(product.id);

    return result;
  }

  async transferProductStock(
    businessId: string,
    productId: string,
    userId: string,
    dto: TransferProductStockDto,
  ) {
    await this.ensureManagementAccess(businessId, userId);

    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException(
        'Source and destination locations must be different',
      );
    }

    const [product, fromLocation, toLocation, currency] = await Promise.all([
      this.getProductOrThrow(businessId, productId),
      this.resolveLocation(businessId, dto.fromLocationId),
      this.resolveLocation(businessId, dto.toLocationId),
      this.getBusinessCurrency(businessId),
    ]);

    const referenceId = randomUUID();

    const result = await this.prisma.$transaction(async (tx) => {
      const consumption = await this.consumeProductStock(tx, {
        businessId,
        productId: product.id,
        locationId: fromLocation.id,
        quantity: round4(dto.quantity),
        currency,
        movementType: InventoryMovementType.TRANSFER_OUT,
        note: dto.note,
        referenceType: 'PRODUCT_TRANSFER',
        referenceId,
        createdByUserId: userId,
      });

      for (const layer of consumption.layers) {
        await this.createProductInboundLot(tx, {
          businessId,
          productId: product.id,
          locationId: toLocation.id,
          quantity: layer.quantity,
          currency,
          sourceType: InventoryLotSourceType.TRANSFER,
          note: dto.note,
          referenceType: 'PRODUCT_TRANSFER',
          referenceId,
          createdByUserId: userId,
          movementType: InventoryMovementType.TRANSFER_IN,
          costs: {
            materialCost: layer.materialCost,
            directLaborCost: layer.directLaborCost,
            allocatedCifCost: layer.allocatedCifCost,
            totalCost: layer.totalUnitCost,
          },
        });
      }

      await tx.product.update({
        where: { id: product.id },
        data: {
          currentStock: product.currentStock,
        },
      });

      return {
        referenceId,
        transferredQuantity: round4(dto.quantity),
        fromLocationId: fromLocation.id,
        toLocationId: toLocation.id,
      };
    });

    await this.syncProductAlert(product.id);

    return result;
  }
}
