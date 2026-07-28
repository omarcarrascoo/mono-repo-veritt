import type { MembershipRole } from './business.types'

export type ProcessStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
export type ProcessExecutionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
// Fuente única del rol: business.types (re-exportado por compatibilidad).
export type { MembershipRole }

export interface ProcessStep {
  id: string
  processId: string
  name: string
  description?: string | null
  stepOrder: number
  requiredRole?: MembershipRole | null
  assignedAreaId?: string | null
}

export interface ProcessTemplate {
  id: string
  businessId: string
  name: string
  description?: string | null
  isBlocking: boolean
  status: ProcessStatus
  createdAt?: string
  updatedAt?: string
  steps?: ProcessStep[]
}

export interface ProcessExecution {
  id: string
  businessId: string
  processId: string
  areaId?: string | null
  executedByUserId: string
  startedAt: string
  completedAt?: string | null
  status: ProcessExecutionStatus
  notesJson?: Record<string, unknown> | null
  process?: ProcessTemplate
  area?: { id: string; name: string; type: string } | null
}

export interface ProcessStepDto {
  name: string
  description?: string
  stepOrder: number
  requiredRole?: MembershipRole
  assignedAreaId?: string
}

export interface CreateProcessDto {
  name: string
  description?: string
  isBlocking?: boolean
  steps: ProcessStepDto[]
}

export interface UpdateProcessDto {
  name?: string
  description?: string
  isBlocking?: boolean
  status?: ProcessStatus
}

export interface CreateProcessExecutionDto {
  areaId?: string
  notes?: string
}
