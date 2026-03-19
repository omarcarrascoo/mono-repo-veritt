import axios from 'axios';
import { ENV } from '@/constants/env';

let authToken: string | null = null;
let onUnauthorized: (() => Promise<void> | void) | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

export function setApiUnauthorizedHandler(handler: (() => Promise<void> | void) | null) {
  onUnauthorized = handler;
}

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401 && onUnauthorized) {
      await onUnauthorized();
    }

    return Promise.reject(error);
  }
);