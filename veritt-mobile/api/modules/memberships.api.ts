import { apiClient } from '@/api/client';
import {
  AddMemberDto,
  Member,
  UpdateMemberDto,
} from '@/types/membership.types';

const base = (businessId: string) => `/businesses/${businessId}/members`;

export const membershipsApi = {
  async list(businessId: string): Promise<Member[]> {
    const { data } = await apiClient.get<Member[]>(base(businessId));
    return data;
  },

  async add(businessId: string, dto: AddMemberDto): Promise<Member> {
    const { data } = await apiClient.post<Member>(base(businessId), dto);
    return data;
  },

  async update(
    businessId: string,
    memberId: string,
    dto: UpdateMemberDto,
  ): Promise<Member> {
    const { data } = await apiClient.patch<Member>(
      `${base(businessId)}/${memberId}`,
      dto,
    );
    return data;
  },
};
