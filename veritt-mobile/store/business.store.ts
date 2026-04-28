import { create } from 'zustand';
import { businessesApi } from '@/api/modules/businesses.api';
import type { Business, MembershipRole } from '@/types/business.types';

interface BusinessState {
  businesses: Business[];
  isLoaded: boolean;
  isLoading: boolean;
  loadBusinesses: () => Promise<void>;
  getRole: (businessId: string) => MembershipRole | null;
  reset: () => void;
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  businesses: [],
  isLoaded: false,
  isLoading: false,

  loadBusinesses: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const businesses = await businessesApi.getMine();
      set({ businesses, isLoaded: true });
    } finally {
      set({ isLoading: false });
    }
  },

  getRole: (businessId: string): MembershipRole | null => {
    const biz = get().businesses.find((b) => b.id === businessId);
    return biz?.userRole ?? null;
  },

  reset: () => {
    set({ businesses: [], isLoaded: false, isLoading: false });
  },
}));
