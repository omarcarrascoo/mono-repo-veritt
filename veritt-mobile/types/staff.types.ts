export type StaffStatus = 'ACTIVE' | 'INACTIVE';
export type SystemAccessLevel = 'NONE' | 'OPERATOR' | 'SUPERVISOR' | 'ADMIN';
export type PayrollFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'SEMIMONTHLY'
  | 'MONTHLY';

export interface StaffCompensation {
  id: string;
  staffProfileId: string;
  salaryAmount: number | string;
  salaryCurrency: string;
  payrollFrequency: PayrollFrequency;
  weeklyPayDay?: number | null;
  monthlyPayDay?: number | null;
  semimonthlyFirstDay?: number | null;
  semimonthlySecondDay?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffProfile {
  id: string;
  businessId: string;
  userId?: string | null;
  fullName: string;
  phoneNumber?: string | null;
  email?: string | null;
  operationalRole: string;
  assignedAreasJson?: Record<string, unknown>;
  shift?: string | null;
  systemAccessLevel: SystemAccessLevel;
  username?: string | null;
  status: StaffStatus;
  createdAt?: string;
  updatedAt?: string;
  compensation?: StaffCompensation | null;
}

export interface CreateStaffCompensationDto {
  salaryAmount: number;
  salaryCurrency?: string;
  payrollFrequency: PayrollFrequency;
  weeklyPayDay?: number;
  monthlyPayDay?: number;
  semimonthlyFirstDay?: number;
  semimonthlySecondDay?: number;
}

export interface CreateStaffProfileDto {
  fullName: string;
  phoneNumber?: string;
  email?: string;
  operationalRole: string;
  shift?: string;
  assignedAreasJson?: Record<string, unknown>;
  systemAccessLevel?: SystemAccessLevel;
  username?: string;
  compensation?: CreateStaffCompensationDto;
}