export type ShiftLogStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export type ShiftBreakType = 'MEAL' | 'REST' | 'OTHER'

export interface ShiftBreak {
  id: string
  shiftLogId: string
  startAt: string
  endAt?: string | null
  type: ShiftBreakType
  minutes?: number | null
}

export interface ShiftLog {
  id: string
  businessId: string
  staffProfileId: string
  areaId?: string | null
  clockInAt: string
  clockOutAt?: string | null
  clockInLatitude?: number | null
  clockInLongitude?: number | null
  clockOutLatitude?: number | null
  clockOutLongitude?: number | null
  totalMinutes?: number | null
  status: ShiftLogStatus
  note?: string | null
  createdAt?: string
  breaks?: ShiftBreak[]
  staffProfile?: { id: string; fullName: string; operationalRole: string }
  area?: { id: string; name: string; type: string } | null
}

export interface ClockInDto {
  staffProfileId: string
  areaId?: string
  latitude?: number
  longitude?: number
}

export interface ClockOutDto {
  latitude?: number
  longitude?: number
  note?: string
}

export interface ShiftSummary {
  staffProfileId: string
  _sum: { totalMinutes: number | null }
  _count: { id: number }
}
