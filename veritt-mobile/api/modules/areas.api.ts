import { apiClient } from '@/api/client';
import { Area, CreateAreaDto, UpdateAreaDto } from '@/types/area.types';

export const areasApi = {
  async list(businessId: string): Promise<Area[]> {
    const { data } = await apiClient.get<Area[]>(
      `/businesses/${businessId}/areas`
    );
    return data;
  },

  async get(businessId: string, areaId: string): Promise<Area> {
    const { data } = await apiClient.get<Area>(
      `/businesses/${businessId}/areas/${areaId}`
    );
    return data;
  },

  async create(businessId: string, payload: CreateAreaDto): Promise<Area> {
    const { data } = await apiClient.post<Area>(
      `/businesses/${businessId}/areas`,
      payload
    );
    return data;
  },

  async update(
    businessId: string,
    areaId: string,
    payload: UpdateAreaDto
  ): Promise<Area> {
    const { data } = await apiClient.patch<Area>(
      `/businesses/${businessId}/areas/${areaId}`,
      payload
    );
    return data;
  },

  async linkLocation(
    businessId: string,
    areaId: string,
    locationId: string
  ): Promise<unknown> {
    const { data } = await apiClient.post(
      `/businesses/${businessId}/areas/${areaId}/link-location`,
      { locationId }
    );
    return data;
  },
};
