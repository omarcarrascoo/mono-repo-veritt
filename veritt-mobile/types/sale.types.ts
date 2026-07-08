export type SaleStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'
export type DecimalValue = number | string

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  quantity: DecimalValue
  unitPrice: DecimalValue
  totalPrice: DecimalValue
  costSnapshot: DecimalValue
  recipeVersionId?: string | null
  product?: { id: string; name: string; category?: string | null }
  recipeVersion?: { id: string; versionNumber: number } | null
  theoreticalConsumptions?: TheoreticalConsumption[]
}

export interface SalePayment {
  id: string
  saleId: string
  paymentMethodId: string
  amount: DecimalValue
  reference?: string | null
  paymentMethod?: { id: string; name: string; type: string }
}

export interface Sale {
  id: string
  businessId: string
  areaId?: string | null
  operatorStaffId: string
  saleNumber: number
  subtotal: DecimalValue
  taxAmount: DecimalValue
  total: DecimalValue
  status: SaleStatus
  cancelledByUserId?: string | null
  cancellationReason?: string | null
  completedAt?: string | null
  cancelledAt?: string | null
  note?: string | null
  createdAt?: string
  items?: SaleItem[]
  payments?: SalePayment[]
  area?: { id: string; name: string; type: string } | null
  operator?: { id: string; fullName: string; operationalRole: string }
  theoreticalConsumptions?: TheoreticalConsumption[]
}

export interface TheoreticalConsumption {
  id: string
  materialId: string
  recipeVersionId: string
  productQuantity: DecimalValue
  recipeQuantity: DecimalValue
  wastePercent: DecimalValue
  expectedQuantity: DecimalValue
  unitCostSnapshot: DecimalValue
  expectedCost: DecimalValue
  calculatedAt: string
  material?: { id: string; name: string; baseUnit: string }
}

export interface TheoreticalConsumptionSummary {
  materialId: string
  materialName: string
  baseUnit: string
  totalExpectedQuantity: number
  totalExpectedCost: number
}

export interface CreateSaleItemDto {
  productId: string
  quantity: number
  unitPrice: number
}

export interface CreateSalePaymentDto {
  paymentMethodId: string
  amount: number
  reference?: string
}

export interface CreateSaleDto {
  areaId?: string
  /**
   * Opcional. Si no viene, el backend resuelve el staffProfile del usuario
   * autenticado (JWT). Managers pueden pasar un ID distinto para registrar
   * ventas a nombre de otro operador.
   */
  operatorStaffId?: string
  items: CreateSaleItemDto[]
  payments: CreateSalePaymentDto[]
  taxAmount?: number
  note?: string
}

export interface PeriodSaleSummary {
  from: string
  to: string
  totalRevenue: number
  totalCOGS: number
  grossMargin: number
  grossMarginPercent: number
  saleCount: number
  avgTicket: number
  daily: Array<{
    date: string
    revenue: number
    cogs: number
    count: number
  }>
  byPaymentMethod: Array<{
    paymentMethodId: string
    paymentMethodName: string
    total: number
  }>
  byArea: Array<{
    areaId: string
    areaName: string
    revenue: number
    saleCount: number
  }>
}

export interface ProductRevenueSummary {
  productId: string
  productName: string
  category: string | null
  totalRevenue: number
  totalQuantitySold: number
  estimatedCOGS: number
  estimatedMargin: number
  unitsSold: number
}

export interface DailySaleSummary {
  operationalDate: string
  totalRevenue: number
  totalCOGS: number
  grossMargin: number
  grossMarginPercent: number
  saleCount: number
  avgTicket: number
  byPaymentMethod: Array<{
    paymentMethodId: string
    paymentMethodName: string
    total: number
  }>
  byArea: Array<{
    areaId: string
    areaName: string
    revenue: number
    saleCount: number
  }>
}
