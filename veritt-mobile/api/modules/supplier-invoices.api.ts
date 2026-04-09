import { apiClient } from '@/api/client';
import { SupplierInvoice, CreateSupplierInvoiceDto, UpdateSupplierInvoiceDto } from '@/types/supplier-invoice.types';

export const supplierInvoicesApi = {
  async list(businessId: string, filters?: { supplierId?: string; status?: string }): Promise<SupplierInvoice[]> {
    const { data } = await apiClient.get<SupplierInvoice[]>(
      `/businesses/${businessId}/supplier-invoices`,
      { params: filters }
    );
    return data;
  },

  async get(businessId: string, invoiceId: string): Promise<SupplierInvoice> {
    const { data } = await apiClient.get<SupplierInvoice>(
      `/businesses/${businessId}/supplier-invoices/${invoiceId}`
    );
    return data;
  },

  async create(businessId: string, payload: CreateSupplierInvoiceDto): Promise<SupplierInvoice> {
    const { data } = await apiClient.post<SupplierInvoice>(
      `/businesses/${businessId}/supplier-invoices`,
      payload
    );
    return data;
  },

  async update(
    businessId: string,
    invoiceId: string,
    payload: UpdateSupplierInvoiceDto
  ): Promise<SupplierInvoice> {
    const { data } = await apiClient.patch<SupplierInvoice>(
      `/businesses/${businessId}/supplier-invoices/${invoiceId}`,
      payload
    );
    return data;
  },

  async verify(businessId: string, invoiceId: string): Promise<SupplierInvoice> {
    const { data } = await apiClient.post<SupplierInvoice>(
      `/businesses/${businessId}/supplier-invoices/${invoiceId}/verify`
    );
    return data;
  },

  async dispute(businessId: string, invoiceId: string, reason: string): Promise<SupplierInvoice> {
    const { data } = await apiClient.post<SupplierInvoice>(
      `/businesses/${businessId}/supplier-invoices/${invoiceId}/dispute`,
      { reason }
    );
    return data;
  },

  async softDelete(businessId: string, invoiceId: string, reason: string): Promise<SupplierInvoice> {
    const { data } = await apiClient.post<SupplierInvoice>(
      `/businesses/${businessId}/supplier-invoices/${invoiceId}/delete`,
      { reason }
    );
    return data;
  },

  async getReceiptTotal(businessId: string, receiptId: string): Promise<{ receiptId: string; total: number }> {
    const { data } = await apiClient.get<{ receiptId: string; total: number }>(
      `/businesses/${businessId}/supplier-invoices/receipt-total/${receiptId}`
    );
    return data;
  },
};
