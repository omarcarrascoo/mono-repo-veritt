import { apiClient } from '@/api/client';
import { Supplier, CreateSupplierDto, UpdateSupplierDto } from '@/types/supplier.types';

export const suppliersApi = {
  async list(businessId: string, status?: string): Promise<Supplier[]> {
    const params = status ? { status } : undefined;
    const { data } = await apiClient.get<Supplier[]>(
      `/businesses/${businessId}/suppliers`,
      { params }
    );
    return data;
  },

  async get(businessId: string, supplierId: string): Promise<Supplier> {
    const { data } = await apiClient.get<Supplier>(
      `/businesses/${businessId}/suppliers/${supplierId}`
    );
    return data;
  },

  async create(businessId: string, payload: CreateSupplierDto): Promise<Supplier> {
    const { data } = await apiClient.post<Supplier>(
      `/businesses/${businessId}/suppliers`,
      payload
    );
    return data;
  },

  async update(
    businessId: string,
    supplierId: string,
    payload: UpdateSupplierDto
  ): Promise<Supplier> {
    const { data } = await apiClient.patch<Supplier>(
      `/businesses/${businessId}/suppliers/${supplierId}`,
      payload
    );
    return data;
  },
};
