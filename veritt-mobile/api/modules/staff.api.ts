import { apiClient } from '@/api/client';
import { CreateStaffProfileDto, StaffProfile } from '@/types/staff.types';

export const staffApi = {
  async getByBusinessId(businessId: string): Promise<StaffProfile[]> {
    const { data } = await apiClient.get<StaffProfile[]>(
      `/businesses/${businessId}/staff`
    );
    return data;
  },

  async getById(businessId: string, staffId: string): Promise<StaffProfile> {
    const { data } = await apiClient.get<StaffProfile>(
      `/businesses/${businessId}/staff/${staffId}`
    );
    return data;
  },

  async create(
    businessId: string,
    payload: CreateStaffProfileDto
  ): Promise<StaffProfile> {
    const { data } = await apiClient.post<StaffProfile>(
      `/businesses/${businessId}/staff`,
      payload
    );
    return data;
  },

  async update(
    businessId: string,
    staffId: string,
    payload: Partial<CreateStaffProfileDto> & { status?: 'ACTIVE' | 'INACTIVE' }
  ): Promise<StaffProfile> {
    const { data } = await apiClient.patch<StaffProfile>(
      `/businesses/${businessId}/staff/${staffId}`,
      payload
    );
    return data;
  },
};