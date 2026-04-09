import { apiClient } from '@/api/client';
import {
  PaymentMethod,
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from '@/types/payment-method.types';

export const paymentMethodsApi = {
  async list(businessId: string): Promise<PaymentMethod[]> {
    const { data } = await apiClient.get<PaymentMethod[]>(
      `/businesses/${businessId}/payment-methods`
    );
    return data;
  },

  async create(
    businessId: string,
    payload: CreatePaymentMethodDto
  ): Promise<PaymentMethod> {
    const { data } = await apiClient.post<PaymentMethod>(
      `/businesses/${businessId}/payment-methods`,
      payload
    );
    return data;
  },

  async update(
    businessId: string,
    paymentMethodId: string,
    payload: UpdatePaymentMethodDto
  ): Promise<PaymentMethod> {
    const { data } = await apiClient.patch<PaymentMethod>(
      `/businesses/${businessId}/payment-methods/${paymentMethodId}`,
      payload
    );
    return data;
  },
};
