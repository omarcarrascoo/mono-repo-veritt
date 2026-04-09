export type ReceiptStatus = 'COMPLETED' | 'PARTIAL' | 'CANCELLED'

export interface ReceiptItem {
  id: string
  receiptId: string
  materialId: string
  quantityReceived: number
  actualUnitCost: number
  lotId?: string | null
  material?: { id: string; name: string; unit: string }
}

export interface Receipt {
  id: string
  businessId: string
  purchaseOrderId?: string | null
  receivedByUserId: string
  locationId: string
  status: ReceiptStatus
  notes?: string | null
  cancellationReason?: string | null
  cancellationComment?: string | null
  cancelledByUserId?: string | null
  cancelledAt?: string | null
  receivedAt?: string
  createdAt?: string
  updatedAt?: string
  purchaseOrder?: { id: string; orderNumber: number; supplier?: { id: string; name: string } }
  receivedBy?: { id: string; fullName: string }
  cancelledBy?: { id: string; fullName: string }
  location?: { id: string; name: string }
  items?: ReceiptItem[]
}

export interface CreateReceiptItemDto {
  materialId: string
  quantityReceived: number
  actualUnitCost: number
}

export interface CreateReceiptDto {
  purchaseOrderId?: string
  locationId: string
  notes?: string
  items: CreateReceiptItemDto[]
}

export interface CancelReceiptDto {
  reason: string
  comment?: string
}
