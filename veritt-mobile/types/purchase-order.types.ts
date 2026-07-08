export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'

export interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  materialId: string
  quantityOrdered: number
  estimatedUnitCost: number
  notes?: string | null
  material?: { id: string; name: string; unit: string }
}

export interface PurchaseOrder {
  id: string
  businessId: string
  supplierId: string
  createdByUserId: string
  orderNumber: number
  status: PurchaseOrderStatus
  totalEstimated: number
  currency: string
  notes?: string | null
  sentAt?: string | null
  createdAt?: string
  updatedAt?: string
  supplier?: { id: string; name: string }
  createdBy?: { id: string; email: string }
  items?: PurchaseOrderItem[]
}

export interface CreatePurchaseOrderItemDto {
  materialId: string
  quantityOrdered: number
  estimatedUnitCost: number
  notes?: string
}

export interface CreatePurchaseOrderDto {
  supplierId: string
  currency?: string
  notes?: string
  items: CreatePurchaseOrderItemDto[]
}

export interface UpdatePurchaseOrderDto {
  notes?: string
}
