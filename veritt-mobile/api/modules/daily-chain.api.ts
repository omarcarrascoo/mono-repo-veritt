import { apiClient } from '@/api/client'
import {
  DailyChainStatus,
  DailyInventoryOpening,
  CreateOpeningDto,
  DailyInventoryClosing,
  CreateClosingDto,
  DailyDeviationReport,
  ClassifyDeviationDto,
  DailyCashReconciliation,
  CreateReconciliationDto,
  DailyOperationClose,
} from '@/types/daily-chain.types'

const base = (businessId: string) => `/businesses/${businessId}/daily-chain`

export const dailyChainApi = {
  // Status
  async getStatus(businessId: string, date?: string): Promise<DailyChainStatus> {
    const params = date ? { date } : undefined
    const { data } = await apiClient.get<DailyChainStatus>(`${base(businessId)}/status`, { params })
    return data
  },

  // FAI
  async createOpening(businessId: string, dto: CreateOpeningDto): Promise<DailyInventoryOpening> {
    const { data } = await apiClient.post<DailyInventoryOpening>(`${base(businessId)}/opening`, dto)
    return data
  },

  async getOpening(businessId: string, date?: string, locationId?: string): Promise<DailyInventoryOpening | null> {
    const params: Record<string, string> = {}
    if (date) params.date = date
    if (locationId) params.locationId = locationId
    const { data } = await apiClient.get<DailyInventoryOpening | null>(`${base(businessId)}/opening`, { params })
    return data
  },

  async authorizeOpening(businessId: string, openingId: string): Promise<DailyInventoryOpening> {
    const { data } = await apiClient.post<DailyInventoryOpening>(`${base(businessId)}/opening/${openingId}/authorize`)
    return data
  },

  async rejectOpening(businessId: string, openingId: string, reason: string): Promise<DailyInventoryOpening> {
    const { data } = await apiClient.post<DailyInventoryOpening>(`${base(businessId)}/opening/${openingId}/reject`, { reason })
    return data
  },

  // FCI
  async createClosing(businessId: string, dto: CreateClosingDto): Promise<DailyInventoryClosing> {
    const { data } = await apiClient.post<DailyInventoryClosing>(`${base(businessId)}/closing`, dto)
    return data
  },

  async getClosing(businessId: string, date?: string): Promise<DailyInventoryClosing | null> {
    const params = date ? { date } : undefined
    const { data } = await apiClient.get<DailyInventoryClosing | null>(`${base(businessId)}/closing`, { params })
    return data
  },

  async authorizeClosing(businessId: string, closingId: string): Promise<DailyInventoryClosing> {
    const { data } = await apiClient.post<DailyInventoryClosing>(`${base(businessId)}/closing/${closingId}/authorize`)
    return data
  },

  async rejectClosing(businessId: string, closingId: string, reason: string): Promise<DailyInventoryClosing> {
    const { data } = await apiClient.post<DailyInventoryClosing>(`${base(businessId)}/closing/${closingId}/reject`, { reason })
    return data
  },

  // FID
  async getDeviations(businessId: string, date?: string): Promise<DailyDeviationReport | null> {
    const params = date ? { date } : undefined
    const { data } = await apiClient.get<DailyDeviationReport | null>(`${base(businessId)}/deviations`, { params })
    return data
  },

  async classifyDeviations(businessId: string, reportId: string, dto: ClassifyDeviationDto): Promise<DailyDeviationReport> {
    const { data } = await apiClient.patch<DailyDeviationReport>(`${base(businessId)}/deviations/${reportId}/classify`, dto)
    return data
  },

  async approveDeviations(businessId: string, reportId: string): Promise<DailyDeviationReport> {
    const { data } = await apiClient.post<DailyDeviationReport>(`${base(businessId)}/deviations/${reportId}/approve`)
    return data
  },

  // FAF
  async getReconciliation(businessId: string, date?: string): Promise<DailyCashReconciliation | null> {
    const params = date ? { date } : undefined
    const { data } = await apiClient.get<DailyCashReconciliation | null>(`${base(businessId)}/reconciliation`, { params })
    return data
  },

  async createReconciliation(businessId: string, dto: CreateReconciliationDto): Promise<DailyCashReconciliation> {
    const { data } = await apiClient.post<DailyCashReconciliation>(`${base(businessId)}/reconciliation`, dto)
    return data
  },

  async approveReconciliation(businessId: string, reconciliationId: string): Promise<DailyCashReconciliation> {
    const { data } = await apiClient.post<DailyCashReconciliation>(`${base(businessId)}/reconciliation/${reconciliationId}/approve`)
    return data
  },

  async rejectReconciliation(businessId: string, reconciliationId: string, reason: string): Promise<DailyCashReconciliation> {
    const { data } = await apiClient.post<DailyCashReconciliation>(`${base(businessId)}/reconciliation/${reconciliationId}/reject`, { reason })
    return data
  },

  // FOP
  async getFOP(businessId: string, date?: string): Promise<DailyOperationClose | null> {
    const params = date ? { date } : undefined
    const { data } = await apiClient.get<DailyOperationClose | null>(`${base(businessId)}/fop`, { params })
    return data
  },

  async signFOP(businessId: string, fopId: string, discrepancyJustification?: string): Promise<DailyOperationClose> {
    const body = discrepancyJustification ? { discrepancyJustification } : undefined
    const { data } = await apiClient.post<DailyOperationClose>(`${base(businessId)}/fop/${fopId}/sign`, body)
    return data
  },
}
