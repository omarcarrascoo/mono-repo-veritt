import axios from 'axios';
import { ApiErrorResponse } from '@/types/api.types';

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error inesperado'
): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const apiMessage = error.response?.data?.message;

    if (Array.isArray(apiMessage)) {
      return apiMessage.join('\n');
    }

    if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
      return apiMessage;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}