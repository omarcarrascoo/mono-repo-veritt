// ── Chain Status ──

export interface DailyChainStatus {
  operationalDate: string
  fai: { id: string; status: DailyOpeningStatus; locationId: string } | null
  fci: { id: string; status: DailyClosingStatus; locationId: string } | null
  fid: { id: string; status: DeviationReportStatus; totalDeviationValueMXN: number } | null
  faf: { id: string; status: ReconciliationStatus; difference: number } | null
  fop: { id: string; status: DailyOperationStatus; signedAt: string | null } | null
}

// ── FAI ──

export type DailyOpeningStatus = 'PENDING' | 'AUTHORIZED' | 'REJECTED'

export interface DailyInventoryOpening {
  id: string
  businessId: string
  locationId: string
  operationalDate: string
  status: DailyOpeningStatus
  authorizedByUserId?: string | null
  authorizedAt?: string | null
  rejectedReason?: string | null
  createdByUserId: string
  createdAt: string
  location: { id: string; name: string }
  items: DailyOpeningItem[]
}

export interface DailyOpeningItem {
  id: string
  materialId: string
  countedQuantity: number
  previousClosingQuantity: number
  systemQuantity: number
  variance: number
  varianceValueMXN: number
  varianceNote?: string | null
  material: { id: string; name: string; baseUnit: string }
}

export interface CreateOpeningDto {
  locationId: string
  date?: string
  items: Array<{ materialId: string; countedQuantity: number; varianceNote?: string }>
}

// ── FCI ──

export type DailyClosingStatus = 'PENDING' | 'AUTHORIZED' | 'REJECTED' | 'COMPLETED'

export interface DailyInventoryClosing {
  id: string
  businessId: string
  locationId: string
  operationalDate: string
  status: DailyClosingStatus
  completedByUserId?: string | null
  completedAt?: string | null
  authorizedByUserId?: string | null
  authorizedAt?: string | null
  rejectedReason?: string | null
  createdByUserId: string
  createdAt: string
  location: { id: string; name: string }
  items: DailyClosingItem[]
}

export interface DailyClosingItem {
  id: string
  materialId: string
  countedQuantity: number
  openingQuantity: number
  receivedQuantity: number
  realConsumption: number
  material: { id: string; name: string; baseUnit: string }
}

export interface CreateClosingDto {
  locationId: string
  date?: string
  items: Array<{ materialId: string; countedQuantity: number }>
}

// ── FID ──

export type DeviationReportStatus = 'PENDING_CLASSIFICATION' | 'CLASSIFIED' | 'APPROVED'
export type DeviationCause = 'ERROR' | 'WASTE' | 'THEFT' | 'ADJUSTMENT' | 'OVERPRODUCTION' | 'UNDERPRODUCTION' | 'OTHER'

export interface DailyDeviationReport {
  id: string
  businessId: string
  operationalDate: string
  status: DeviationReportStatus
  totalDeviationValueMXN: number
  approvedByUserId?: string | null
  approvedAt?: string | null
  createdAt: string
  items: DeviationItem[]
}

export interface DeviationItem {
  id: string
  materialId: string
  theoreticalConsumption: number
  realConsumption: number
  deviationQuantity: number
  deviationValueMXN: number
  cause?: DeviationCause | null
  classifiedByUserId?: string | null
  note?: string | null
  material: { id: string; name: string; baseUnit: string }
}

export interface ClassifyDeviationDto {
  items: Array<{ materialId: string; cause: DeviationCause; note?: string }>
}

// ── FAF ──

export type ReconciliationStatus = 'PENDING' | 'PENDING_REVIEW' | 'RECONCILED' | 'DISCREPANCY' | 'REJECTED'

export interface DailyCashReconciliation {
  id: string
  businessId: string
  operationalDate: string
  status: ReconciliationStatus
  totalExpected: number
  totalCounted: number
  difference: number
  createdByUserId: string
  approvedByUserId?: string | null
  approvedAt?: string | null
  rejectedByUserId?: string | null
  rejectedAt?: string | null
  rejectedReason?: string | null
  createdAt: string
  cashDenominations: CashDenominationCount[]
  terminalReconciliations: TerminalReconciliationItem[]
  transferReconciliations: TransferReconciliationItem[]
}

export interface CashDenominationCount {
  id: string
  denomination: number
  quantity: number
  subtotal: number
}

export interface TerminalReconciliationItem {
  id: string
  paymentMethodId: string
  expectedTotal: number
  reportedTotal: number
  reference?: string | null
  difference: number
  paymentMethod: { id: string; name: string; type: string }
}

export interface TransferReconciliationItem {
  id: string
  expectedTotal: number
  reportedTotal: number
  folioReferences?: string | null
  difference: number
}

export interface CreateReconciliationDto {
  date?: string
  cashDenominations: Array<{ denomination: number; quantity: number }>
  terminalTotals?: Array<{ paymentMethodId: string; reportedTotal: number; reference?: string }>
  transferTotals?: Array<{ reportedTotal: number; folioReferences?: string }>
}

// ── FOP ──

export type DailyOperationStatus = 'PENDING' | 'SIGNED' | 'BLOCKED'
export type FOPValidationType = 'INVENTORY' | 'CASH' | 'PROCESSES' | 'HOURS'

export interface DailyOperationClose {
  id: string
  businessId: string
  operationalDate: string
  status: DailyOperationStatus
  signedByUserId?: string | null
  signedAt?: string | null
  signedWithDiscrepancy?: boolean
  discrepancyJustification?: string | null
  createdAt: string
  validationItems: FOPValidationItem[]
}

export interface FOPValidationItem {
  id: string
  validationType: FOPValidationType
  label: string
  operatorValue: number
  systemValue: number
  difference: number
  isWithinThreshold: boolean
  resolution?: string | null
}
