import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { InventoryService } from './inventory.service';
import {
  CreateInventoryLocationDto,
  UpdateInventoryLocationDto,
} from './dto/location.dto';
import {
  AdjustMaterialStockDto,
  CreateMaterialDto,
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
  ReceiveProductLotDto,
  TransferProductStockDto,
  UpdateProductDto,
} from './dto/product.dto';

@Controller('businesses/:businessId/inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('categories')
  listCategories(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.inventoryService.listCategories(businessId, user.id);
  }

  @Get('locations')
  listLocations(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.inventoryService.listLocations(businessId, user.id);
  }

  @Post('locations')
  createLocation(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateInventoryLocationDto,
  ) {
    return this.inventoryService.createLocation(businessId, user.id, dto);
  }

  @Patch('locations/:locationId')
  updateLocation(
    @Param('businessId') businessId: string,
    @Param('locationId') locationId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateInventoryLocationDto,
  ) {
    return this.inventoryService.updateLocation(
      businessId,
      locationId,
      user.id,
      dto,
    );
  }

  @Get('materials')
  listMaterials(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.inventoryService.listMaterials(businessId, user.id);
  }

  @Get('materials/:materialId')
  getMaterial(
    @Param('businessId') businessId: string,
    @Param('materialId') materialId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.inventoryService.getMaterial(businessId, materialId, user.id);
  }

  @Post('materials')
  createMaterial(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateMaterialDto,
  ) {
    return this.inventoryService.createMaterial(businessId, user.id, dto);
  }

  @Patch('materials/:materialId')
  updateMaterial(
    @Param('businessId') businessId: string,
    @Param('materialId') materialId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMaterialDto,
  ) {
    return this.inventoryService.updateMaterial(
      businessId,
      materialId,
      user.id,
      dto,
    );
  }

  @Post('materials/:materialId/receipts')
  receiveMaterialLot(
    @Param('businessId') businessId: string,
    @Param('materialId') materialId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ReceiveMaterialLotDto,
  ) {
    return this.inventoryService.receiveMaterialLot(
      businessId,
      materialId,
      user.id,
      dto,
    );
  }

  @Post('materials/:materialId/adjustments')
  adjustMaterialStock(
    @Param('businessId') businessId: string,
    @Param('materialId') materialId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AdjustMaterialStockDto,
  ) {
    return this.inventoryService.adjustMaterialStock(
      businessId,
      materialId,
      user.id,
      dto,
    );
  }

  @Post('materials/:materialId/transfers')
  transferMaterialStock(
    @Param('businessId') businessId: string,
    @Param('materialId') materialId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: TransferMaterialStockDto,
  ) {
    return this.inventoryService.transferMaterialStock(
      businessId,
      materialId,
      user.id,
      dto,
    );
  }

  @Get('products')
  listProducts(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.inventoryService.listProducts(businessId, user.id);
  }

  @Get('products/:productId')
  getProduct(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.inventoryService.getProduct(businessId, productId, user.id);
  }

  @Post('products')
  createProduct(
    @Param('businessId') businessId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateProductDto,
  ) {
    return this.inventoryService.createProduct(businessId, user.id, dto);
  }

  @Patch('products/:productId')
  updateProduct(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProductDto,
  ) {
    return this.inventoryService.updateProduct(
      businessId,
      productId,
      user.id,
      dto,
    );
  }

  @Post('products/:productId/prices')
  addProductPrice(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AddProductPriceDto,
  ) {
    return this.inventoryService.addProductPrice(
      businessId,
      productId,
      user.id,
      dto,
    );
  }

  @Post('products/:productId/manual-costs')
  addProductManualCost(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AddProductManualCostDto,
  ) {
    return this.inventoryService.addProductManualCost(
      businessId,
      productId,
      user.id,
      dto,
    );
  }

  @Post('products/:productId/recipe-versions')
  createRecipeVersion(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateProductRecipeVersionDto,
  ) {
    return this.inventoryService.createProductRecipeVersion(
      businessId,
      productId,
      user.id,
      dto,
    );
  }

  @Post('products/:productId/receipts')
  receiveProductLot(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: ReceiveProductLotDto,
  ) {
    return this.inventoryService.receiveProductLot(
      businessId,
      productId,
      user.id,
      dto,
    );
  }

  @Post('products/:productId/production-batches')
  createProductionBatch(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateProductionBatchDto,
  ) {
    return this.inventoryService.createProductionBatch(
      businessId,
      productId,
      user.id,
      dto,
    );
  }

  @Post('products/:productId/adjustments')
  adjustProductStock(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AdjustProductStockDto,
  ) {
    return this.inventoryService.adjustProductStock(
      businessId,
      productId,
      user.id,
      dto,
    );
  }

  @Post('products/:productId/transfers')
  transferProductStock(
    @Param('businessId') businessId: string,
    @Param('productId') productId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: TransferProductStockDto,
  ) {
    return this.inventoryService.transferProductStock(
      businessId,
      productId,
      user.id,
      dto,
    );
  }
}
