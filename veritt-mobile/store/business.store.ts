import { create } from 'zustand';
import { businessesApi } from '@/api/modules/businesses.api';
import type { Business, MembershipRole } from '@/types/business.types';
import type { ChainTone } from '@/lib/daily-chain-home';

interface BusinessState {
  businesses: Business[];
  isLoaded: boolean;
  isLoading: boolean;
  activeBusinessId: string | null;
  chainToneByBusinessId: Record<string, ChainTone>;
  loadBusinesses: () => Promise<void>;
  getRole: (businessId: string) => MembershipRole | null;
  getActiveBusiness: () => Business | null;
  setActiveBusiness: (businessId: string) => void;
  setChainTone: (businessId: string, tone: ChainTone) => void;
  reset: () => void;
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  businesses: [],
  isLoaded: false,
  isLoading: false,
  activeBusinessId: null,
  chainToneByBusinessId: {},

  loadBusinesses: async () => {
    if (get().isLoading) return;
    set({ isLoading: true });
    try {
      const businesses = await businessesApi.getMine();
      const currentActive = get().activeBusinessId;
      const stillExists = currentActive
        ? businesses.some((b) => b.id === currentActive)
        : false;
      set({
        businesses,
        isLoaded: true,
        activeBusinessId: stillExists
          ? currentActive
          : businesses[0]?.id ?? null,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  getRole: (businessId: string): MembershipRole | null => {
    const biz = get().businesses.find((b) => b.id === businessId);
    return biz?.userRole ?? null;
  },

  getActiveBusiness: (): Business | null => {
    const { businesses, activeBusinessId } = get();
    if (!activeBusinessId) return businesses[0] ?? null;
    return businesses.find((b) => b.id === activeBusinessId) ?? null;
  },

  setActiveBusiness: (businessId: string) => {
    set({ activeBusinessId: businessId });
  },

  setChainTone: (businessId: string, tone: ChainTone) => {
    const current = get().chainToneByBusinessId;
    if (current[businessId] === tone) return;
    set({
      chainToneByBusinessId: { ...current, [businessId]: tone },
    });
  },

  reset: () => {
    set({
      businesses: [],
      isLoaded: false,
      isLoading: false,
      activeBusinessId: null,
      chainToneByBusinessId: {},
    });
  },
}));
