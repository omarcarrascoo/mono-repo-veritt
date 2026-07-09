import { apiClient } from '@/api/client'
import {
  AddProductManualCostDto,
  AddProductPriceDto,
  AdjustMaterialStockDto,
  AdjustProductStockDto,
  CreateInventoryLocationDto,
  CreateMaterialDto,
  CreateProductDto,
  CreateMaterialRecipeDto,
  CreateProductRecipeVersionDto,
  CreateProductionBatchDto,
  InventoryTransferResult,
  InventoryLocation,
  Material,
  MaterialLot,
  MaterialRecipe,
  MaterialStockTransactionResult,
  ProduceTransformedMaterialDto,
  ProduceTransformedMaterialResult,
  Product,
  ProductLot,
  ProductManualCostHistory,
  ProductRecipeVersion,
  ProductSalePriceHistory,
  ProductStockTransactionResult,
  ReceiveMaterialLotDto,
  ReceiveProductLotDto,
  TransferMaterialStockDto,
  TransferProductStockDto,
  UpdateInventoryLocationDto,
  UpdateMaterialDto,
  UpdateProductDto,
} from '@/types/inventory.types'

export const inventoryApi = {
  async listCategories(businessId: string): Promise<string[]> {
    const { data } = await apiClient.get<string[]>(
      `/businesses/${businessId}/inventory/categories`
    )
    return data
  },

  async listLocations(businessId: string): Promise<InventoryLocation[]> {
    const { data } = await apiClient.get<InventoryLocation[]>(
      `/businesses/${businessId}/inventory/locations`
    )
    return data
  },

  async createLocation(
    businessId: string,
    payload: CreateInventoryLocationDto
  ): Promise<InventoryLocation> {
    const { data } = await apiClient.post<InventoryLocation>(
      `/businesses/${businessId}/inventory/locations`,
      payload
    )
    return data
  },

  async updateLocation(
    businessId: string,
    locationId: string,
    payload: UpdateInventoryLocationDto
  ): Promise<InventoryLocation> {
    const { data } = await apiClient.patch<InventoryLocation>(
      `/businesses/${businessId}/inventory/locations/${locationId}`,
      payload
    )
    return data
  },

  async listMaterials(businessId: string): Promise<Material[]> {
    const { data } = await apiClient.get<Material[]>(
      `/businesses/${businessId}/inventory/materials`
    )
    return data
  },

  async getMaterial(businessId: string, materialId: string): Promise<Material> {
    const { data } = await apiClient.get<Material>(
      `/businesses/${businessId}/inventory/materials/${materialId}`
    )
    return data
  },

  async createMaterial(
    businessId: string,
    payload: CreateMaterialDto
  ): Promise<Material> {
    const { data } = await apiClient.post<Material>(
      `/businesses/${businessId}/inventory/materials`,
      payload
    )
    return data
  },

  async updateMaterial(
    businessId: string,
    materialId: string,
    payload: UpdateMaterialDto
  ): Promise<Material> {
    const { data } = await apiClient.patch<Material>(
      `/businesses/${businessId}/inventory/materials/${materialId}`,
      payload
    )
    return data
  },

  async receiveMaterialLot(
    businessId: string,
    materialId: string,
    payload: ReceiveMaterialLotDto
  ): Promise<MaterialLot> {
    const { data } = await apiClient.post<MaterialLot>(
      `/businesses/${businessId}/inventory/materials/${materialId}/receipts`,
      payload
    )
    return data
  },

  async adjustMaterialStock(
    businessId: string,
    materialId: string,
    payload: AdjustMaterialStockDto
  ): Promise<MaterialLot | MaterialStockTransactionResult> {
    const { data } = await apiClient.post<MaterialLot | MaterialStockTransactionResult>(
      `/businesses/${businessId}/inventory/materials/${materialId}/adjustments`,
      payload
    )
    return data
  },

  async transferMaterialStock(
    businessId: string,
    materialId: string,
    payload: TransferMaterialStockDto
  ): Promise<InventoryTransferResult> {
    const { data } = await apiClient.post<InventoryTransferResult>(
      `/businesses/${businessId}/inventory/materials/${materialId}/transfers`,
      payload
    )
    return data
  },

  // FTI: define la receta de producción de un insumo transformado.
  async createMaterialRecipe(
    businessId: string,
    materialId: string,
    payload: CreateMaterialRecipeDto
  ): Promise<MaterialRecipe> {
    const { data } = await apiClient.post<MaterialRecipe>(
      `/businesses/${businessId}/inventory/materials/${materialId}/recipe`,
      payload
    )
    return data
  },

  // FTI: produce el insumo transformado consumiendo los crudos de su receta.
  async produceTransformedMaterial(
    businessId: string,
    materialId: string,
    payload: ProduceTransformedMaterialDto
  ): Promise<ProduceTransformedMaterialResult> {
    const { data } = await apiClient.post<ProduceTransformedMaterialResult>(
      `/businesses/${businessId}/inventory/materials/${materialId}/production`,
      payload
    )
    return data
  },

  async listProducts(businessId: string): Promise<Product[]> {
    const { data } = await apiClient.get<Product[]>(
      `/businesses/${businessId}/inventory/products`
    )
    return data
  },

  async getProduct(businessId: string, productId: string): Promise<Product> {
    const { data } = await apiClient.get<Product>(
      `/businesses/${businessId}/inventory/products/${productId}`
    )
    return data
  },

  async createProduct(
    businessId: string,
    payload: CreateProductDto
  ): Promise<Product> {
    const { data } = await apiClient.post<Product>(
      `/businesses/${businessId}/inventory/products`,
      payload
    )
    return data
  },

  async updateProduct(
    businessId: string,
    productId: string,
    payload: UpdateProductDto
  ): Promise<Product> {
    const { data } = await apiClient.patch<Product>(
      `/businesses/${businessId}/inventory/products/${productId}`,
      payload
    )
    return data
  },

  async addProductPrice(
    businessId: string,
    productId: string,
    payload: AddProductPriceDto
  ): Promise<ProductSalePriceHistory> {
    const { data } = await apiClient.post<ProductSalePriceHistory>(
      `/businesses/${businessId}/inventory/products/${productId}/prices`,
      payload
    )
    return data
  },

  async addProductManualCost(
    businessId: string,
    productId: string,
    payload: AddProductManualCostDto
  ): Promise<ProductManualCostHistory> {
    const { data } = await apiClient.post<ProductManualCostHistory>(
      `/businesses/${businessId}/inventory/products/${productId}/manual-costs`,
      payload
    )
    return data
  },

  async createRecipeVersion(
    businessId: string,
    productId: string,
    payload: CreateProductRecipeVersionDto
  ): Promise<ProductRecipeVersion> {
    const { data } = await apiClient.post<ProductRecipeVersion>(
      `/businesses/${businessId}/inventory/products/${productId}/recipe-versions`,
      payload
    )
    return data
  },

  async receiveProductLot(
    businessId: string,
    productId: string,
    payload: ReceiveProductLotDto
  ): Promise<ProductLot> {
    const { data } = await apiClient.post<ProductLot>(
      `/businesses/${businessId}/inventory/products/${productId}/receipts`,
      payload
    )
    return data
  },

  async createProductionBatch(
    businessId: string,
    productId: string,
    payload: CreateProductionBatchDto
  ): Promise<ProductStockTransactionResult> {
    const { data } = await apiClient.post<ProductStockTransactionResult>(
      `/businesses/${businessId}/inventory/products/${productId}/production-batches`,
      payload
    )
    return data
  },

  async adjustProductStock(
    businessId: string,
    productId: string,
    payload: AdjustProductStockDto
  ): Promise<ProductLot | ProductStockTransactionResult> {
    const { data } = await apiClient.post<ProductLot | ProductStockTransactionResult>(
      `/businesses/${businessId}/inventory/products/${productId}/adjustments`,
      payload
    )
    return data
  },

  async transferProductStock(
    businessId: string,
    productId: string,
    payload: TransferProductStockDto
  ): Promise<InventoryTransferResult> {
    const { data } = await apiClient.post<InventoryTransferResult>(
      `/businesses/${businessId}/inventory/products/${productId}/transfers`,
      payload
    )
    return data
  },
}
