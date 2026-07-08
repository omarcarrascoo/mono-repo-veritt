export type SupplierStatus = 'ACTIVE' | 'INACTIVE'

export interface Supplier {
  id: string
  businessId: string
  name: string
  contactName?: string | null
  email?: string | null
  phone?: string | null
  rfc?: string | null
  address?: string | null
  notes?: string | null
  status: SupplierStatus
  createdAt?: string
  updatedAt?: string
}

export interface CreateSupplierDto {
  name: string
  contactName?: string
  email?: string
  phone?: string
  rfc?: string
  address?: string
  notes?: string
}

export interface UpdateSupplierDto {
  name?: string
  contactName?: string
  email?: string
  phone?: string
  rfc?: string
  address?: string
  notes?: string
  status?: SupplierStatus
}
