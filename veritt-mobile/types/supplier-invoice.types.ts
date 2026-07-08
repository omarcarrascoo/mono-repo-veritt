export type SupplierInvoiceStatus = 'PENDING' | 'VERIFIED' | 'DISPUTED' | 'DELETED'

export interface SupplierInvoice {
  id: string
  businessId: string
  supplierId: string
  receiptId?: string | null
  cfdiUuid?: string | null
  cfdiXml?: string | null
  totalAmount: number
  receiptTotal?: number | null
  discrepancyNote?: string | null
  currency: string
  invoiceDate: string
  status: SupplierInvoiceStatus
  verifiedByUserId?: string | null
  verifiedAt?: string | null
  deletedByUserId?: string | null
  deletedAt?: string | null
  deletionReason?: string | null
  createdAt?: string
  updatedAt?: string
  supplier?: { id: string; name: string }
  receipt?: {
    id: string
    receivedAt?: string
    status?: string
    location?: { id: string; name: string }
    purchaseOrder?: { id: string; orderNumber: number }
    items?: Array<{
      materialId: string
      quantityReceived: number
      actualUnitCost: number
      material?: { id: string; name: string }
    }>
  }
  verifiedBy?: { id: string; fullName: string }
  deletedBy?: { id: string; fullName: string }
}

export interface CreateSupplierInvoiceDto {
  supplierId: string
  receiptId?: string
  cfdiUuid?: string
  cfdiXml?: string
  totalAmount: number
  currency?: string
  invoiceDate: string
  discrepancyNote?: string
}

export interface UpdateSupplierInvoiceDto {
  cfdiUuid?: string
  cfdiXml?: string
  status?: SupplierInvoiceStatus
}
