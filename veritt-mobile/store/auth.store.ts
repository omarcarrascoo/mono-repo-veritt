import { create } from 'zustand';
import { authApi } from '@/api/modules/auth.api';
import { ENV } from '@/constants/env';
import { setApiAuthToken, setApiUnauthorizedHandler } from '@/api/client';
import { storage } from '@/utils/secure-storage';
import type { AuthUser, LoginDto, RegisterDto } from '@/types/auth.types';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isInitializing: boolean;
  isLoggingIn: boolean;
  isRegistering: boolean;
  bootstrap: () => Promise<void>;
  login: (payload: LoginDto) => Promise<void>;
  register: (payload: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isHydrated: false,
  isInitializing: false,
  isLoggingIn: false,
  isRegistering: false,

  bootstrap: async () => {
    if (get().isHydrated || get().isInitializing) return;

    set({ isInitializing: true });

    try {
      setApiUnauthorizedHandler(async () => {
        await get().logout();
      });

      const token = await storage.getItem(ENV.TOKEN_KEY);

      if (!token) {
        setApiAuthToken(null);
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isHydrated: true,
          isInitializing: false,
        });
        return;
      }

      setApiAuthToken(token);

      const user = await authApi.getMe();

      set({
        token,
        user,
        isAuthenticated: true,
        isHydrated: true,
        isInitializing: false,
      });
    } catch {
      await storage.removeItem(ENV.TOKEN_KEY);
      setApiAuthToken(null);

      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isHydrated: true,
        isInitializing: false,
      });
    }
  },

  login: async (payload) => {
    set({ isLoggingIn: true });

    try {
      const data = await authApi.login({
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      });

      if (typeof data.accessToken !== 'string' || !data.accessToken.trim()) {
        throw new Error('Access token inválido');
      }

      await storage.setItem(ENV.TOKEN_KEY, data.accessToken);
      setApiAuthToken(data.accessToken);

      set({
        token: data.accessToken,
        user: data.user,
        isAuthenticated: true,
      });
    } finally {
      set({ isLoggingIn: false });
    }
  },

  register: async (payload) => {
    set({ isRegistering: true });

    try {
      const data = await authApi.register({
        fullName: payload.fullName.trim(),
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      });

      if (typeof data.accessToken !== 'string' || !data.accessToken.trim()) {
        throw new Error('Access token inválido');
      }

      await storage.setItem(ENV.TOKEN_KEY, data.accessToken);
      setApiAuthToken(data.accessToken);

      set({
        token: data.accessToken,
        user: data.user,
        isAuthenticated: true,
      });
    } finally {
      set({ isRegistering: false });
    }
  },

  logout: async () => {
    await storage.removeItem(ENV.TOKEN_KEY);
    setApiAuthToken(null);

    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isHydrated: true,
      isInitializing: false,
      isLoggingIn: false,
      isRegistering: false,
    });
  },
}));