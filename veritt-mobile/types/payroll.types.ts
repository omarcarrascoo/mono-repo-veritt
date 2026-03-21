import { PayrollFrequency, StaffStatus } from '@/types/staff.types';

export type PayrollPaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'OVERDUE'
  | 'SKIPPED'
  | 'CANCELED';

export interface PayrollPaymentStaffSummary {
  id: string;
  fullName: string;
  operationalRole: string;
  status: StaffStatus;
}

export interface PayrollPayment {
  id: string;
  businessId: string;
  staffProfileId: string;
  amount: number | string;
  currency: string;
  payrollFrequency: PayrollFrequency;
  dueDate: string;
  status: PayrollPaymentStatus;
  paidAt?: string | null;
  paidByUserId?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  staffProfile: PayrollPaymentStaffSummary;
}

export interface UpcomingPayrollPaymentsResponse {
  todayDate: string;
  upcomingWindowDays: number;
  overdue: PayrollPayment[];
  dueToday: PayrollPayment[];
  upcoming: PayrollPayment[];
}

export interface PayrollPaymentHistoryResponse {
  items: PayrollPayment[];
}

export interface UpdatePayrollPaymentDto {
  status: 'PENDING' | 'PAID' | 'SKIPPED';
  paidAt?: string;
  notes?: string;
}

export interface StaffCompensationHistoryItem {
  id: string;
  staffProfileId: string;
  salaryAmount: number | string;
  salaryCurrency: string;
  payrollFrequency: PayrollFrequency;
  firstPaymentDate: string;
  weeklyPayDay?: number | null;
  monthlyPayDay?: number | null;
  semimonthlyFirstDay?: number | null;
  semimonthlySecondDay?: number | null;
  effectiveFrom: string;
  createdByUserId?: string | null;
  changeReason?: string | null;
  createdAt: string;
}
