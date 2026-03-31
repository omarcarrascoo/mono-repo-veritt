export type DecimalValue = number | string

export type InventoryLocationType =
  | 'MAIN'
  | 'WAREHOUSE'
  | 'RESTAURANT'
  | 'KITCHEN'
  | 'OTHER'

export type InventoryStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'

export type InventoryAdjustmentDirection = 'IN' | 'OUT'

export type InventoryLotSourceType =
  | 'OPENING_BALANCE'
  | 'PURCHASE'
  | 'RECEIPT'
  | 'TRANSFER'
  | 'PRODUCTION'
  | 'ADJUSTMENT'

export type InventoryMovementType =
  | 'OPENING_BALANCE'
  | 'PURCHASE'
  | 'RECEIPT'
  | 'PRODUCTION_IN'
  | 'PRODUCTION_OUT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'SALE'
  | 'RETURN'
  | 'WASTE'

export type ProductType = 'DIRECT' | 'RECIPE'

export interface InventoryLocation {
  id: string
  businessId: string
  name: string
  type: InventoryLocationType
  isPrimary: boolean
  status: InventoryStatus
  createdAt?: string
  updatedAt?: string
}

export interface MaterialLot {
  id: string
  businessId: string
  materialId: string
  locationId: string
  sourceType: InventoryLotSourceType
  lotCode?: string | null
  originalQuantity: DecimalValue
  remainingQuantity: DecimalValue
  unitCost: DecimalValue
  totalCost: DecimalValue
  currency: string
  receivedAt: string
  expiresAt?: string | null
  referenceType?: string | null
  referenceId?: string | null
  note?: string | null
  createdByUserId?: string | null
  createdAt?: string
}

export interface Material {
  id: string
  businessId: string
  name: string
  baseUnit: string
  category?: string | null
  sku?: string | null
  reorderFrequencyDays?: number | null
  minStock: DecimalValue
  currentStock: DecimalValue
  currentReferenceUnitCost: DecimalValue
  status: InventoryStatus
  createdAt?: string
  updatedAt?: string
  lots?: MaterialLot[]
}

export interface MaterialStockMovement {
  id: string
  businessId: string
  materialId: string
  locationId: string
  lotId?: string | null
  type: InventoryMovementType
  quantityDelta: DecimalValue
  balanceAfter: DecimalValue
  unitCostSnapshot?: DecimalValue | null
  totalCostSnapshot?: DecimalValue | null
  currency?: string | null
  referenceType?: string | null
  referenceId?: string | null
  note?: string | null
  createdByUserId?: string | null
  createdAt?: string
}

export interface ProductSalePriceHistory {
  id: string
  businessId: string
  productId: string
  price: DecimalValue
  currency: string
  effectiveFrom: string
  createdByUserId?: string | null
  changeReason?: string | null
  createdAt?: string
}

export interface ProductManualCostHistory {
  id: string
  businessId: string
  productId: string
  materialCost: DecimalValue
  directLaborCost: DecimalValue
  allocatedCifCost: DecimalValue
  totalCost: DecimalValue
  effectiveFrom: string
  createdByUserId?: string | null
  changeReason?: string | null
  createdAt?: string
}

export interface ProductRecipeVersionItem {
  id?: string
  recipeVersionId?: string
  materialId: string
  quantity: DecimalValue
  wastePercent?: DecimalValue
  createdAt?: string
}

export interface ProductRecipeVersion {
  id: string
  businessId: string
  productId: string
  versionNumber: number
  effectiveFrom: string
  materialCost: DecimalValue
  directLaborCost: DecimalValue
  allocatedCifCost: DecimalValue
  totalCost: DecimalValue
  note?: string | null
  createdByUserId?: string | null
  createdAt?: string
  items: ProductRecipeVersionItem[]
}

export interface ProductLot {
  id: string
  businessId: string
  productId: string
  locationId: string
  sourceType: InventoryLotSourceType
  originalQuantity: DecimalValue
  remainingQuantity: DecimalValue
  materialCost: DecimalValue
  directLaborCost: DecimalValue
  allocatedCifCost: DecimalValue
  totalUnitCost: DecimalValue
  totalLotCost: DecimalValue
  currency: string
  producedAt: string
  referenceType?: string | null
  referenceId?: string | null
  note?: string | null
  createdByUserId?: string | null
  createdAt?: string
}

export interface Product {
  id: string
  businessId: string
  name: string
  category?: string | null
  type: ProductType
  stockUnit: string
  estimatedDailySalesVolume?: DecimalValue | null
  minStock: DecimalValue
  currentStock: DecimalValue
  currentSalePrice: DecimalValue
  currentMaterialCost: DecimalValue
  currentDirectLaborCost: DecimalValue
  currentAllocatedCifCost: DecimalValue
  currentCost: DecimalValue
  status: InventoryStatus
  createdAt?: string
  updatedAt?: string
  recipeVersions?: ProductRecipeVersion[]
  lots?: ProductLot[]
}

export interface ProductStockMovement {
  id: string
  businessId: string
  productId: string
  locationId: string
  lotId?: string | null
  type: InventoryMovementType
  quantityDelta: DecimalValue
  balanceAfter: DecimalValue
  materialCostSnapshot?: DecimalValue | null
  directLaborCostSnapshot?: DecimalValue | null
  allocatedCifCostSnapshot?: DecimalValue | null
  totalUnitCostSnapshot?: DecimalValue | null
  totalCostSnapshot?: DecimalValue | null
  currency?: string | null
  referenceType?: string | null
  referenceId?: string | null
  note?: string | null
  createdByUserId?: string | null
  createdAt?: string
}

export interface CreateInventoryLocationDto {
  name: string
  type?: InventoryLocationType
}

export interface UpdateInventoryLocationDto {
  name?: string
  type?: InventoryLocationType
  status?: InventoryStatus
}

export interface CreateMaterialDto {
  name: string
  baseUnit: string
  category?: string
  sku?: string
  reorderFrequencyDays?: number
  minStock?: number
}

export interface UpdateMaterialDto extends Partial<CreateMaterialDto> {
  status?: InventoryStatus
}

export interface ReceiveMaterialLotDto {
  locationId?: string
  quantity: number
  unitCost: number
  lotCode?: string
  receivedAt?: string
  expiresAt?: string
  note?: string
}

export interface AdjustMaterialStockDto {
  locationId?: string
  direction: InventoryAdjustmentDirection
  quantity: number
  unitCost?: number
  note?: string
}

export interface TransferMaterialStockDto {
  fromLocationId: string
  toLocationId: string
  quantity: number
  note?: string
}

export interface CreateProductDto {
  name: string
  type: ProductType
  category?: string
  stockUnit?: string
  estimatedDailySalesVolume?: number
  minStock?: number
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  status?: InventoryStatus
}

export interface ProductCostBreakdownDto {
  materialCost?: number
  directLaborCost?: number
  allocatedCifCost?: number
  totalCost?: number
}

export interface AddProductPriceDto {
  price: number
  effectiveFrom?: string
  changeReason?: string
}

export interface AddProductManualCostDto extends ProductCostBreakdownDto {
  effectiveFrom?: string
  changeReason?: string
}

export interface CreateProductRecipeVersionDto {
  effectiveFrom?: string
  directLaborCost?: number
  allocatedCifCost?: number
  note?: string
  items: ProductRecipeVersionItemDto[]
}

export interface ProductRecipeVersionItemDto {
  materialId: string
  quantity: number
  wastePercent?: number
}

export interface ReceiveProductLotDto extends ProductCostBreakdownDto {
  locationId?: string
  quantity: number
  producedAt?: string
  note?: string
}

export interface CreateProductionBatchDto {
  locationId?: string
  recipeVersionId?: string
  quantity: number
  producedAt?: string
  directLaborCost?: number
  allocatedCifCost?: number
  note?: string
}

export interface AdjustProductStockDto extends ProductCostBreakdownDto {
  locationId?: string
  direction: InventoryAdjustmentDirection
  quantity: number
  note?: string
}

export interface TransferProductStockDto {
  fromLocationId: string
  toLocationId: string
  quantity: number
  note?: string
}

export interface MaterialStockTransactionResult {
  movement: MaterialStockMovement
  layers: Array<{
    lotId?: string
    quantity: DecimalValue
    unitCost: DecimalValue
    totalCost: DecimalValue
  }>
  totalCost: DecimalValue
  unitCostSnapshot?: DecimalValue
}

export interface ProductStockTransactionResult {
  movement?: ProductStockMovement
  layers?: Array<{
    lotId?: string
    quantity: DecimalValue
    materialCost: DecimalValue
    directLaborCost: DecimalValue
    allocatedCifCost: DecimalValue
    totalUnitCost: DecimalValue
    totalCost: DecimalValue
  }>
  totalCost?: DecimalValue
  referenceId?: string
  recipeVersionId?: string
  transferredQuantity?: DecimalValue
  fromLocationId?: string
  toLocationId?: string
  lot?: ProductLot
}

export interface InventoryTransferResult {
  referenceId: string
  transferredQuantity: DecimalValue
  fromLocationId: string
  toLocationId: string
}
