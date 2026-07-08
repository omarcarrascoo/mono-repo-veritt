import { apiClient } from '@/api/client';
import {
  ShiftLog,
  ClockInDto,
  ClockOutDto,
  ShiftSummary,
} from '@/types/time-tracking.types';

export const timeTrackingApi = {
  async clockIn(businessId: string, payload: ClockInDto): Promise<ShiftLog> {
    const { data } = await apiClient.post<ShiftLog>(
      `/businesses/${businessId}/shifts/clock-in`,
      payload
    );
    return data;
  },

  async clockOut(
    businessId: string,
    shiftId: string,
    payload?: ClockOutDto
  ): Promise<ShiftLog> {
    const { data } = await apiClient.post<ShiftLog>(
      `/businesses/${businessId}/shifts/${shiftId}/clock-out`,
      payload ?? {}
    );
    return data;
  },

  async startBreak(
    businessId: string,
    shiftId: string,
    type?: string
  ): Promise<unknown> {
    const { data } = await apiClient.post(
      `/businesses/${businessId}/shifts/${shiftId}/breaks/start`,
      type ? { type } : {}
    );
    return data;
  },

  async endBreak(
    businessId: string,
    shiftId: string,
    breakId: string
  ): Promise<unknown> {
    const { data } = await apiClient.post(
      `/businesses/${businessId}/shifts/${shiftId}/breaks/${breakId}/end`,
      {}
    );
    return data;
  },

  async list(
    businessId: string,
    params?: {
      staffProfileId?: string;
      status?: string;
      from?: string;
      to?: string;
    }
  ): Promise<ShiftLog[]> {
    const { data } = await apiClient.get<ShiftLog[]>(
      `/businesses/${businessId}/shifts`,
      { params }
    );
    return data;
  },

  async getActive(businessId: string): Promise<ShiftLog[]> {
    const { data } = await apiClient.get<ShiftLog[]>(
      `/businesses/${businessId}/shifts/active`
    );
    return data;
  },

  async get(businessId: string, shiftId: string): Promise<ShiftLog> {
    const { data } = await apiClient.get<ShiftLog>(
      `/businesses/${businessId}/shifts/${shiftId}`
    );
    return data;
  },

  async getSummary(
    businessId: string,
    from: string,
    to: string
  ): Promise<ShiftSummary[]> {
    const { data } = await apiClient.get<ShiftSummary[]>(
      `/businesses/${businessId}/shifts/summary`,
      { params: { from, to } }
    );
    return data;
  },
};
