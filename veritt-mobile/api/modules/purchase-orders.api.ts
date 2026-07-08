import { apiClient } from '@/api/client';
import { PurchaseOrder, CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from '@/types/purchase-order.types';

export const purchaseOrdersApi = {
  async list(businessId: string, filters?: { status?: string; supplierId?: string }): Promise<PurchaseOrder[]> {
    const { data } = await apiClient.get<PurchaseOrder[]>(
      `/businesses/${businessId}/purchase-orders`,
      { params: filters }
    );
    return data;
  },

  async get(businessId: string, poId: string): Promise<PurchaseOrder> {
    const { data } = await apiClient.get<PurchaseOrder>(
      `/businesses/${businessId}/purchase-orders/${poId}`
    );
    return data;
  },

  async create(businessId: string, payload: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    const { data } = await apiClient.post<PurchaseOrder>(
      `/businesses/${businessId}/purchase-orders`,
      payload
    );
    return data;
  },

  async update(
    businessId: string,
    poId: string,
    payload: UpdatePurchaseOrderDto
  ): Promise<PurchaseOrder> {
    const { data } = await apiClient.patch<PurchaseOrder>(
      `/businesses/${businessId}/purchase-orders/${poId}`,
      payload
    );
    return data;
  },

  async send(businessId: string, poId: string): Promise<PurchaseOrder> {
    const { data } = await apiClient.post<PurchaseOrder>(
      `/businesses/${businessId}/purchase-orders/${poId}/send`
    );
    return data;
  },

  async cancel(businessId: string, poId: string): Promise<PurchaseOrder> {
    const { data } = await apiClient.post<PurchaseOrder>(
      `/businesses/${businessId}/purchase-orders/${poId}/cancel`
    );
    return data;
  },
};
