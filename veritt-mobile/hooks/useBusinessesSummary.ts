import { useCallback, useEffect, useRef, useState } from 'react';

import { dailyChainApi } from '@/api/modules/daily-chain.api';
import { salesApi } from '@/api/modules/sales.api';
import { staffApi } from '@/api/modules/staff.api';
import { businessesApi } from '@/api/modules/businesses.api';
import type { Business } from '@/types/business.types';
import type { DailyChainStatus } from '@/types/daily-chain.types';
import {
  getDailyChainMoment,
  type ChainTone,
  type DailyChainMoment,
} from '@/lib/daily-chain-home';
import { MANAGER_ROLES } from '@/types/business.types';
import { permissions } from '@/lib/role-permissions';

export interface BusinessSummary {
  businessId: string;
  chain: DailyChainStatus | null;
  tone: ChainTone;
  moment: DailyChainMoment | null;
  /** null → el rol no puede ver dinero; number → ventas del día */
  dailySalesTotal: number | null;
  ticketCount: number;
  activeStaffCount: number;
  onboardingPercent: number;
  canSeeFinance: boolean;
  isLoading: boolean;
}

const TTL_MS = 60_000;

type Entry = {
  summary: Omit<BusinessSummary, 'businessId' | 'isLoading'> | null;
  fetchedAt: number;
  inFlight: Promise<void> | null;
};

const cache = new Map<string, Entry>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isFresh(entry: Entry): boolean {
  return Date.now() - entry.fetchedAt < TTL_MS;
}

async function fetchBusinessSummary(
  business: Business,
): Promise<Omit<BusinessSummary, 'businessId' | 'isLoading'>> {
  const isManager = !!business.userRole && MANAGER_ROLES.includes(business.userRole);
  const canFinance = permissions.canSeeFinance(business.userRole ?? null);
  const canStaff = permissions.canManageStaff(business.userRole ?? null);

  const [chain, sales, staff, onboarding] = await Promise.all([
    dailyChainApi.getStatus(business.id).catch(() => null),
    canFinance
      ? salesApi.getDailySummary(business.id, today()).catch(() => null)
      : Promise.resolve(null),
    canStaff
      ? staffApi.getByBusinessId(business.id).catch(() => [])
      : Promise.resolve([]),
    businessesApi.getOnboarding(business.id).catch(() => null),
  ]);

  const moment = getDailyChainMoment(business.id, chain, isManager);
  const dailySalesTotal = canFinance && sales ? sales.totalRevenue || 0 : null;
  const ticketCount = sales?.saleCount ?? 0;
  const activeStaffCount = staff.filter((s) => s.status === 'ACTIVE').length;
  const onboardingPercent = onboarding?.completionPercentage ?? 0;

  return {
    chain,
    tone: moment.tone,
    moment,
    dailySalesTotal,
    ticketCount,
    activeStaffCount,
    onboardingPercent,
    canSeeFinance: canFinance,
  };
}

function buildInitialSummary(business: Business): BusinessSummary {
  const cached = cache.get(business.id);
  const canFinance = permissions.canSeeFinance(business.userRole ?? null);
  return {
    businessId: business.id,
    chain: cached?.summary?.chain ?? null,
    tone: cached?.summary?.tone ?? 'start',
    moment: cached?.summary?.moment ?? null,
    dailySalesTotal:
      cached?.summary?.dailySalesTotal ?? (canFinance ? 0 : null),
    ticketCount: cached?.summary?.ticketCount ?? 0,
    activeStaffCount: cached?.summary?.activeStaffCount ?? 0,
    onboardingPercent: cached?.summary?.onboardingPercent ?? 0,
    canSeeFinance: cached?.summary?.canSeeFinance ?? canFinance,
    isLoading: !cached?.summary,
  };
}

export function useBusinessesSummary(businesses: Business[]) {
  const [summaries, setSummaries] = useState<Record<string, BusinessSummary>>(() => {
    const initial: Record<string, BusinessSummary> = {};
    for (const b of businesses) {
      initial[b.id] = buildInitialSummary(b);
    }
    return initial;
  });

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (items: Business[], force: boolean) => {
      for (const biz of items) {
        const entry: Entry = cache.get(biz.id) ?? {
          summary: null,
          fetchedAt: 0,
          inFlight: null,
        };
        cache.set(biz.id, entry);

        if (!force && entry.summary && isFresh(entry)) continue;
        if (entry.inFlight) continue;

        const promise = fetchBusinessSummary(biz)
          .then((data) => {
            entry.summary = data;
            entry.fetchedAt = Date.now();
            entry.inFlight = null;
            if (!isMountedRef.current) return;
            setSummaries((prev) => ({
              ...prev,
              [biz.id]: { businessId: biz.id, ...data, isLoading: false },
            }));
          })
          .catch(() => {
            entry.inFlight = null;
          });

        entry.inFlight = promise;
      }
    },
    [],
  );

  useEffect(() => {
    setSummaries((prev) => {
      const next: Record<string, BusinessSummary> = {};
      for (const b of businesses) {
        next[b.id] = prev[b.id] ?? buildInitialSummary(b);
      }
      return next;
    });
    load(businesses, false);
  }, [businesses, load]);

  const refresh = useCallback(async () => {
    await load(businesses, true);
  }, [businesses, load]);

  return { summaries, refresh };
}
