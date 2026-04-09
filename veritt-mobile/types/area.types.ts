export type AreaType = 'KITCHEN' | 'BAR' | 'DINING' | 'CASH_REGISTER' | 'WAREHOUSE' | 'OFFICE' | 'PRODUCTION' | 'OTHER'
export type AreaStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'

export interface Area {
  id: string
  businessId: string
  name: string
  type: AreaType
  description?: string | null
  parentAreaId?: string | null
  status: AreaStatus
  createdAt?: string
  updatedAt?: string
  childAreas?: Area[]
  inventoryLocations?: Array<{ id: string; name: string; type: string }>
  parentArea?: Area | null
}

export interface CreateAreaDto {
  name: string
  type?: AreaType
  description?: string
  parentAreaId?: string
}

export interface UpdateAreaDto {
  name?: string
  type?: AreaType
  description?: string
  parentAreaId?: string
  status?: AreaStatus
}
