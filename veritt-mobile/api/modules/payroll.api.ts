import { apiClient } from '@/api/client';
import {
  PayrollPayment,
  PayrollPaymentHistoryResponse,
  StaffCompensationHistoryItem,
  UpdatePayrollPaymentDto,
  UpcomingPayrollPaymentsResponse,
} from '@/types/payroll.types';

export const payrollApi = {
  async getUpcoming(businessId: string): Promise<UpcomingPayrollPaymentsResponse> {
    const { data } = await apiClient.get<UpcomingPayrollPaymentsResponse>(
      `/businesses/${businessId}/payroll/payments/upcoming`
    );
    return data;
  },

  async getHistory(businessId: string): Promise<PayrollPaymentHistoryResponse> {
    const { data } = await apiClient.get<PayrollPaymentHistoryResponse>(
      `/businesses/${businessId}/payroll/payments/history`
    );
    return data;
  },

  async updatePayment(
    businessId: string,
    paymentId: string,
    payload: UpdatePayrollPaymentDto
  ): Promise<PayrollPayment> {
    const { data } = await apiClient.patch<PayrollPayment>(
      `/businesses/${businessId}/payroll/payments/${paymentId}`,
      payload
    );
    return data;
  },

  async getCompensationHistory(
    businessId: string,
    staffId: string
  ): Promise<StaffCompensationHistoryItem[]> {
    const { data } = await apiClient.get<StaffCompensationHistoryItem[]>(
      `/businesses/${businessId}/staff/${staffId}/compensation-history`
    );
    return data;
  },
};
