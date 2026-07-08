import { apiClient } from '@/api/client';
import {
  Sale,
  CreateSaleDto,
  DailySaleSummary,
  PeriodSaleSummary,
  ProductRevenueSummary,
  TheoreticalConsumptionSummary,
} from '@/types/sale.types';

export const salesApi = {
  async create(businessId: string, payload: CreateSaleDto): Promise<Sale> {
    const { data } = await apiClient.post<Sale>(
      `/businesses/${businessId}/sales`,
      payload
    );
    return data;
  },

  async list(
    businessId: string,
    params?: {
      status?: string;
      areaId?: string;
      operatorStaffId?: string;
      from?: string;
      to?: string;
    }
  ): Promise<Sale[]> {
    const { data } = await apiClient.get<Sale[]>(
      `/businesses/${businessId}/sales`,
      { params }
    );
    return data;
  },

  async get(businessId: string, saleId: string): Promise<Sale> {
    const { data } = await apiClient.get<Sale>(
      `/businesses/${businessId}/sales/${saleId}`
    );
    return data;
  },

  async cancel(
    businessId: string,
    saleId: string,
    reason: string
  ): Promise<Sale> {
    const { data } = await apiClient.post<Sale>(
      `/businesses/${businessId}/sales/${saleId}/cancel`,
      { reason }
    );
    return data;
  },

  async getDailySummary(
    businessId: string,
    date: string
  ): Promise<DailySaleSummary> {
    const { data } = await apiClient.get<DailySaleSummary>(
      `/businesses/${businessId}/sales/daily-summary`,
      { params: { date } }
    );
    return data;
  },

  async getPeriodSummary(
    businessId: string,
    from: string,
    to: string
  ): Promise<PeriodSaleSummary> {
    const { data } = await apiClient.get<PeriodSaleSummary>(
      `/businesses/${businessId}/sales/period-summary`,
      { params: { from, to } }
    );
    return data;
  },

  async getProductRevenue(
    businessId: string,
    from: string,
    to: string
  ): Promise<ProductRevenueSummary[]> {
    const { data } = await apiClient.get<ProductRevenueSummary[]>(
      `/businesses/${businessId}/sales/product-revenue`,
      { params: { from, to } }
    );
    return data;
  },

  async getTheoreticalConsumption(
    businessId: string,
    from: string,
    to: string
  ): Promise<TheoreticalConsumptionSummary[]> {
    const { data } = await apiClient.get<TheoreticalConsumptionSummary[]>(
      `/businesses/${businessId}/sales/theoretical-consumption`,
      { params: { from, to } }
    );
    return data;
  },
};
