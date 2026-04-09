import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SalesRepository } from './sales.repository';
import { CreateSaleDto } from './dto/create-sale.dto';

type Tx = Prisma.TransactionClient;

const round4 = (value: number) => Number(value.toFixed(4));
const toNumber = (value: Prisma.Decimal | number | string | null | undefined) => {
  if (value === null || value === undefined) return 0;
  return Number(value);
};

@Injectable()
export class SalesService {
  constructor(private readonly salesRepository: SalesRepository) {}

  private async ensureBusinessAccess(businessId: string, userId: string) {
    const membership = await this.salesRepository.findMembership(businessId, userId);
    if (!membership) {
      throw new ForbiddenException('You do not belong to this business');
    }
    return membership;
  }

  private async ensureManagementAccess(businessId: string, userId: string) {
    const membership = await this.ensureBusinessAccess(businessId, userId);
    if (!['OWNER', 'ADMIN', 'VERITT_STAFF'].includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return membership;
  }

  async create(businessId: string, userId: string, dto: CreateSaleDto) {
    await this.ensureBusinessAccess(businessId, userId);

    // Validate operator
    const operator = await this.salesRepository.findStaffProfile(dto.operatorStaffId);
    if (!operator || operator.businessId !== businessId) {
      throw new NotFoundException('Operator staff member not found in this business');
    }

    // Validate area
    if (dto.areaId) {
      const area = await this.salesRepository.findArea(dto.areaId);
      if (!area || area.businessId !== businessId) {
        throw new NotFoundException('Area not found in this business');
      }
    }

    // Batch-load products and payment methods to avoid N+1 queries
    const productIds = dto.items.map((i) => i.productId);
    const productsLoaded = await this.salesRepository.findProductsByIds(productIds);
    const productMap = new Map(productsLoaded.map((p) => [p.id, p]));

    const paymentMethodIds = dto.payments.map((p) => p.paymentMethodId);
    const methodsLoaded = await this.salesRepository.findPaymentMethodsByIds(paymentMethodIds);
    const methodMap = new Map(methodsLoaded.map((m) => [m.id, m]));

    // Validate products and build items data
    const itemsData: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      costSnapshot: number;
      recipeVersionId: string | null;
      recipeItems: Array<{ materialId: string; quantity: number; wastePercent: number; unitCost: number }>;
    }> = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product || product.businessId !== businessId) {
        throw new NotFoundException(`Product not found: ${item.productId}`);
      }
      if (product.status !== 'ACTIVE') {
        throw new BadRequestException(`Product is not active: ${product.name}`);
      }

      const totalPrice = round4(item.quantity * item.unitPrice);
      const costSnapshot = toNumber(product.currentCost);
      const latestRecipe = product.recipeVersions[0] ?? null;

      const recipeItems = latestRecipe
        ? latestRecipe.items.map((ri) => ({
            materialId: ri.materialId,
            quantity: toNumber(ri.quantity),
            wastePercent: toNumber(ri.wastePercent),
            unitCost: toNumber(ri.material.currentReferenceUnitCost),
          }))
        : [];

      itemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice,
        costSnapshot,
        recipeVersionId: latestRecipe?.id ?? null,
        recipeItems,
      });
    }

    // Validate payment methods
    for (const payment of dto.payments) {
      const method = methodMap.get(payment.paymentMethodId);
      if (!method || method.businessId !== businessId) {
        throw new NotFoundException(`Payment method not found: ${payment.paymentMethodId}`);
      }
    }

    // Calculate totals
    const subtotal = round4(itemsData.reduce((sum, i) => sum + i.totalPrice, 0));
    const taxAmount = round4(dto.taxAmount ?? 0);
    const total = round4(subtotal + taxAmount);

    // Validate payments sum equals total
    const paymentTotal = round4(dto.payments.reduce((sum, p) => sum + p.amount, 0));
    if (Math.abs(paymentTotal - total) > 0.01) {
      throw new BadRequestException(
        `Payment total (${paymentTotal}) does not match sale total (${total})`,
      );
    }

    // Execute transaction
    const result = await this.salesRepository.prismaClient.$transaction(async (tx: Tx) => {
      const saleNumber = await this.salesRepository.getNextSaleNumber(tx, businessId);

      // Create sale
      const sale = await tx.sale.create({
        data: {
          businessId,
          areaId: dto.areaId,
          operatorStaffId: dto.operatorStaffId,
          saleNumber,
          subtotal,
          taxAmount,
          total,
          status: 'COMPLETED',
          completedAt: new Date(),
          note: dto.note,
        },
      });

      // Create sale items
      for (const item of itemsData) {
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            costSnapshot: item.costSnapshot,
            recipeVersionId: item.recipeVersionId,
          },
        });

        // Create theoretical consumption records
        if (item.recipeVersionId && item.recipeItems.length > 0) {
          for (const ri of item.recipeItems) {
            const expectedQuantity = round4(item.quantity * ri.quantity * (1 + ri.wastePercent / 100));
            const expectedCost = round4(expectedQuantity * ri.unitCost);

            await tx.theoreticalConsumption.create({
              data: {
                businessId,
                saleId: sale.id,
                saleItemId: saleItem.id,
                materialId: ri.materialId,
                recipeVersionId: item.recipeVersionId!,
                productQuantity: item.quantity,
                recipeQuantity: ri.quantity,
                wastePercent: ri.wastePercent,
                expectedQuantity,
                unitCostSnapshot: ri.unitCost,
                expectedCost,
              },
            });
          }
        }

        // Create product stock movement (SALE = negative delta)
        const currentStock = toNumber(
          (await tx.product.findUnique({ where: { id: item.productId }, select: { currentStock: true } }))
            ?.currentStock,
        );
        const newBalance = round4(currentStock - item.quantity);

        const primaryLocation = await tx.inventoryLocation.findFirst({
          where: { businessId, isPrimary: true },
        });
        if (!primaryLocation) {
          throw new BadRequestException(
            'No se encontró una ubicación primaria de inventario. Completa la configuración del negocio.',
          );
        }

        await tx.productStockMovement.create({
          data: {
            businessId,
            productId: item.productId,
            locationId: primaryLocation.id,
            type: 'SALE',
            quantityDelta: round4(-item.quantity),
            balanceAfter: newBalance,
            totalUnitCostSnapshot: item.costSnapshot,
            totalCostSnapshot: round4(item.quantity * item.costSnapshot),
            referenceType: 'Sale',
            referenceId: sale.id,
            createdByUserId: userId,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        });
      }

      // Create sale payments
      for (const payment of dto.payments) {
        await tx.salePayment.create({
          data: {
            saleId: sale.id,
            paymentMethodId: payment.paymentMethodId,
            amount: payment.amount,
            reference: payment.reference,
          },
        });
      }

      return sale;
    });

    // Return full sale with includes
    return this.salesRepository.findOne(result.id);
  }

  async findAll(businessId: string, userId: string, filters: { status?: string; areaId?: string; operatorStaffId?: string; from?: string; to?: string }) {
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

    return this.salesRepository.findAll(businessId, {
      status: filters.status,
      areaId: filters.areaId,
      operatorStaffId: filters.operatorStaffId,
      from: fromDate,
      to: toDate,
    });
  }

  async findOne(businessId: string, saleId: string, userId: string) {
    await this.ensureBusinessAccess(businessId, userId);
    const sale = await this.salesRepository.findOne(saleId);
    if (!sale || sale.businessId !== businessId) {
      throw new NotFoundException('Sale not found');
    }
    return sale;
  }

  async cancel(businessId: string, saleId: string, userId: string, reason: string) {
    await this.ensureManagementAccess(businessId, userId);

    const sale = await this.salesRepository.findOne(saleId);
    if (!sale || sale.businessId !== businessId) {
      throw new NotFoundException('Sale not found');
    }
    if (sale.status !== 'COMPLETED') {
      throw new BadRequestException('Only completed sales can be cancelled');
    }

    await this.salesRepository.prismaClient.$transaction(async (tx: Tx) => {
      // 1. Reverse stock for each sale item
      for (const item of sale.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { currentStock: true },
        });
        const currentStock = toNumber(product?.currentStock);
        const quantity = toNumber(item.quantity);
        const newBalance = round4(currentStock + quantity);

        const primaryLocation = await tx.inventoryLocation.findFirst({
          where: { businessId, isPrimary: true },
        });
        if (!primaryLocation) {
          throw new BadRequestException('No primary inventory location found');
        }

        await tx.productStockMovement.create({
          data: {
            businessId,
            productId: item.productId,
            locationId: primaryLocation.id,
            type: 'RETURN',
            quantityDelta: round4(quantity),
            balanceAfter: newBalance,
            totalUnitCostSnapshot: toNumber(item.costSnapshot),
            totalCostSnapshot: round4(quantity * toNumber(item.costSnapshot)),
            referenceType: 'Sale',
            referenceId: sale.id,
            createdByUserId: userId,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: quantity } },
        });
      }

      // 2. Delete theoretical consumption records
      await tx.theoreticalConsumption.deleteMany({
        where: { saleId: sale.id },
      });

      // 3. Update sale status
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: 'CANCELLED',
          cancelledByUserId: userId,
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
      });
    });

    return this.salesRepository.findOne(saleId);
  }

  async getDailySummary(businessId: string, userId: string, date: string) {
    await this.ensureBusinessAccess(businessId, userId);

    const dayStart = new Date(date);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const sales = await this.salesRepository.findAll(businessId, {
      status: 'COMPLETED',
      from: dayStart,
      to: dayEnd,
    });

    const totalRevenue = round4(sales.reduce((sum, s) => sum + toNumber(s.total), 0));
    const totalCOGS = round4(
      sales.reduce(
        (sum, s) =>
          sum + s.items.reduce((iSum, item) => iSum + toNumber(item.costSnapshot) * toNumber(item.quantity), 0),
        0,
      ),
    );
    const grossMargin = round4(totalRevenue - totalCOGS);
    const grossMarginPercent = totalRevenue > 0 ? round4((grossMargin / totalRevenue) * 100) : 0;
    const saleCount = sales.length;
    const avgTicket = saleCount > 0 ? round4(totalRevenue / saleCount) : 0;

    // By payment method
    const paymentMap = new Map<string, { name: string; total: number }>();
    for (const sale of sales) {
      for (const p of sale.payments) {
        const key = p.paymentMethod.id;
        const existing = paymentMap.get(key) || { name: p.paymentMethod.name, total: 0 };
        existing.total = round4(existing.total + toNumber(p.amount));
        paymentMap.set(key, existing);
      }
    }

    // By area
    const areaMap = new Map<string, { name: string; revenue: number; saleCount: number }>();
    for (const sale of sales) {
      const key = sale.areaId || 'no-area';
      const name = sale.area?.name || 'Sin area';
      const existing = areaMap.get(key) || { name, revenue: 0, saleCount: 0 };
      existing.revenue = round4(existing.revenue + toNumber(sale.total));
      existing.saleCount += 1;
      areaMap.set(key, existing);
    }

    return {
      operationalDate: date,
      totalRevenue,
      totalCOGS,
      grossMargin,
      grossMarginPercent,
      saleCount,
      avgTicket,
      byPaymentMethod: Array.from(paymentMap.entries()).map(([id, data]) => ({
        paymentMethodId: id,
        paymentMethodName: data.name,
        total: data.total,
      })),
      byArea: Array.from(areaMap.entries()).map(([id, data]) => ({
        areaId: id,
        areaName: data.name,
        revenue: data.revenue,
        saleCount: data.saleCount,
      })),
    };
  }

  async getPeriodSummary(businessId: string, userId: string, from: string, to: string) {
    await this.ensureBusinessAccess(businessId, userId);

    const fromDate = new Date(from);
    fromDate.setUTCHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setUTCHours(23, 59, 59, 999);

    const sales = await this.salesRepository.findAll(businessId, {
      status: 'COMPLETED',
      from: fromDate,
      to: toDate,
    });

    const totalRevenue = round4(sales.reduce((sum, s) => sum + toNumber(s.total), 0));
    const totalCOGS = round4(
      sales.reduce(
        (sum, s) =>
          sum + s.items.reduce((iSum, item) => iSum + toNumber(item.costSnapshot) * toNumber(item.quantity), 0),
        0,
      ),
    );
    const grossMargin = round4(totalRevenue - totalCOGS);
    const grossMarginPercent = totalRevenue > 0 ? round4((grossMargin / totalRevenue) * 100) : 0;
    const saleCount = sales.length;
    const avgTicket = saleCount > 0 ? round4(totalRevenue / saleCount) : 0;

    // Daily breakdown
    const dailyMap = new Map<string, { revenue: number; cogs: number; count: number }>();
    for (const sale of sales) {
      const day = new Date(sale.completedAt ?? sale.createdAt).toISOString().split('T')[0];
      const existing = dailyMap.get(day) || { revenue: 0, cogs: 0, count: 0 };
      existing.revenue = round4(existing.revenue + toNumber(sale.total));
      existing.cogs = round4(
        existing.cogs + sale.items.reduce((s, i) => s + toNumber(i.costSnapshot) * toNumber(i.quantity), 0),
      );
      existing.count += 1;
      dailyMap.set(day, existing);
    }

    // By payment method
    const paymentMap = new Map<string, { name: string; total: number }>();
    for (const sale of sales) {
      for (const p of sale.payments) {
        const key = p.paymentMethod.id;
        const existing = paymentMap.get(key) || { name: p.paymentMethod.name, total: 0 };
        existing.total = round4(existing.total + toNumber(p.amount));
        paymentMap.set(key, existing);
      }
    }

    // By area
    const areaMap = new Map<string, { name: string; revenue: number; saleCount: number }>();
    for (const sale of sales) {
      const key = sale.areaId || 'no-area';
      const name = sale.area?.name || 'Sin area';
      const existing = areaMap.get(key) || { name, revenue: 0, saleCount: 0 };
      existing.revenue = round4(existing.revenue + toNumber(sale.total));
      existing.saleCount += 1;
      areaMap.set(key, existing);
    }

    return {
      from,
      to,
      totalRevenue,
      totalCOGS,
      grossMargin,
      grossMarginPercent,
      saleCount,
      avgTicket,
      daily: Array.from(dailyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({ date, ...data })),
      byPaymentMethod: Array.from(paymentMap.entries()).map(([id, data]) => ({
        paymentMethodId: id,
        paymentMethodName: data.name,
        total: data.total,
      })),
      byArea: Array.from(areaMap.entries()).map(([id, data]) => ({
        areaId: id,
        areaName: data.name,
        revenue: data.revenue,
        saleCount: data.saleCount,
      })),
    };
  }

  async getProductRevenue(businessId: string, userId: string, from: string, to: string) {
    await this.ensureBusinessAccess(businessId, userId);

    const fromDate = new Date(from);
    fromDate.setUTCHours(0, 0, 0, 0);
    const toDate = new Date(to);
    toDate.setUTCHours(23, 59, 59, 999);

    const summary = await this.salesRepository.getProductRevenueSummary(businessId, fromDate, toDate);
    const productIds = summary.map((s) => s.productId);
    const products = await this.salesRepository.findProducts(productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));

    return summary.map((s) => {
      const product = productMap.get(s.productId);
      const revenue = toNumber(s._sum.totalPrice);
      const quantity = toNumber(s._sum.quantity);
      const avgCost = toNumber(s._sum.costSnapshot);
      const estimatedCOGS = round4(avgCost * quantity);
      return {
        productId: s.productId,
        productName: product?.name ?? 'Unknown',
        category: product?.category ?? null,
        totalRevenue: revenue,
        totalQuantitySold: quantity,
        estimatedCOGS,
        estimatedMargin: round4(revenue - estimatedCOGS),
        unitsSold: s._count,
      };
    });
  }

  async getTheoreticalConsumption(businessId: string, userId: string, from: string, to: string) {
    await this.ensureBusinessAccess(businessId, userId);

    const summary = await this.salesRepository.getTheoreticalConsumptionSummary(
      businessId,
      new Date(from),
      new Date(to),
    );

    const materialIds = summary.map((s) => s.materialId);
    const materials = await this.salesRepository.findMaterials(materialIds);
    const materialMap = new Map(materials.map((m) => [m.id, m]));

    return summary.map((s) => {
      const mat = materialMap.get(s.materialId);
      return {
        materialId: s.materialId,
        materialName: mat?.name ?? 'Unknown',
        baseUnit: mat?.baseUnit ?? '',
        totalExpectedQuantity: toNumber(s._sum.expectedQuantity),
        totalExpectedCost: toNumber(s._sum.expectedCost),
      };
    });
  }
}
