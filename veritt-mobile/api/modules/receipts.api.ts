import { apiClient } from '@/api/client';
import { Receipt, CreateReceiptDto, CancelReceiptDto } from '@/types/receipt.types';

export const receiptsApi = {
  async list(businessId: string, filters?: { purchaseOrderId?: string; from?: string; to?: string }): Promise<Receipt[]> {
    const { data } = await apiClient.get<Receipt[]>(
      `/businesses/${businessId}/receipts`,
      { params: filters }
    );
    return data;
  },

  async get(businessId: string, receiptId: string): Promise<Receipt> {
    const { data } = await apiClient.get<Receipt>(
      `/businesses/${businessId}/receipts/${receiptId}`
    );
    return data;
  },

  async create(businessId: string, payload: CreateReceiptDto): Promise<Receipt> {
    const { data } = await apiClient.post<Receipt>(
      `/businesses/${businessId}/receipts`,
      payload
    );
    return data;
  },

  async cancel(businessId: string, receiptId: string, payload: CancelReceiptDto): Promise<Receipt> {
    const { data } = await apiClient.post<Receipt>(
      `/businesses/${businessId}/receipts/${receiptId}/cancel`,
      payload
    );
    return data;
  },
};
