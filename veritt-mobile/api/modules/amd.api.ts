import { apiClient } from '@/api/client';
import type {
  AMDListItem,
  AMDRow,
  AMDVerifyResult,
} from '@/types/amd.types';

export const amdApi = {
  async getCurrent(businessId: string, date?: string): Promise<AMDRow> {
    const { data } = await apiClient.get<AMDRow>(
      `/businesses/${businessId}/amd`,
      { params: date ? { date } : undefined },
    );
    return data;
  },

  async getById(businessId: string, amdId: string): Promise<AMDRow> {
    const { data } = await apiClient.get<AMDRow>(
      `/businesses/${businessId}/amd/${amdId}`,
    );
    return data;
  },

  async listHistory(
    businessId: string,
    from: string,
    to: string,
  ): Promise<AMDListItem[]> {
    const { data } = await apiClient.get<AMDListItem[]>(
      `/businesses/${businessId}/amd/history`,
      { params: { from, to } },
    );
    return data;
  },

  async verify(
    businessId: string,
    amdId: string,
  ): Promise<AMDVerifyResult> {
    const { data } = await apiClient.get<AMDVerifyResult>(
      `/businesses/${businessId}/amd/${amdId}/verify`,
    );
    return data;
  },
};
