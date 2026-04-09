import { apiClient } from '@/api/client';
import {
  ProcessTemplate,
  ProcessExecution,
  CreateProcessDto,
  UpdateProcessDto,
  CreateProcessExecutionDto,
} from '@/types/process.types';

export const processesApi = {
  async list(businessId: string): Promise<ProcessTemplate[]> {
    const { data } = await apiClient.get<ProcessTemplate[]>(
      `/businesses/${businessId}/processes`
    );
    return data;
  },

  async get(
    businessId: string,
    processId: string
  ): Promise<ProcessTemplate> {
    const { data } = await apiClient.get<ProcessTemplate>(
      `/businesses/${businessId}/processes/${processId}`
    );
    return data;
  },

  async create(
    businessId: string,
    payload: CreateProcessDto
  ): Promise<ProcessTemplate> {
    const { data } = await apiClient.post<ProcessTemplate>(
      `/businesses/${businessId}/processes`,
      payload
    );
    return data;
  },

  async update(
    businessId: string,
    processId: string,
    payload: UpdateProcessDto
  ): Promise<ProcessTemplate> {
    const { data } = await apiClient.patch<ProcessTemplate>(
      `/businesses/${businessId}/processes/${processId}`,
      payload
    );
    return data;
  },

  async startExecution(
    businessId: string,
    processId: string,
    payload?: CreateProcessExecutionDto
  ): Promise<ProcessExecution> {
    const { data } = await apiClient.post<ProcessExecution>(
      `/businesses/${businessId}/processes/${processId}/executions`,
      payload ?? {}
    );
    return data;
  },

  async completeExecution(
    businessId: string,
    processId: string,
    executionId: string,
    notes?: string
  ): Promise<ProcessExecution> {
    const { data } = await apiClient.patch<ProcessExecution>(
      `/businesses/${businessId}/processes/${processId}/executions/${executionId}/complete`,
      notes ? { notes } : {}
    );
    return data;
  },

  async listExecutions(
    businessId: string,
    params?: {
      processId?: string;
      status?: string;
      from?: string;
      to?: string;
    }
  ): Promise<ProcessExecution[]> {
    const { data } = await apiClient.get<ProcessExecution[]>(
      `/businesses/${businessId}/processes/executions`,
      { params }
    );
    return data;
  },
};
