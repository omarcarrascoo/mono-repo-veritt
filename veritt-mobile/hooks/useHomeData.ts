import { useCallback, useEffect, useRef, useState } from 'react';

import { dailyChainApi } from '@/api/modules/daily-chain.api';
import { salesApi } from '@/api/modules/sales.api';
import { staffApi } from '@/api/modules/staff.api';
import { payrollApi } from '@/api/modules/payroll.api';
import { DailyChainStatus } from '@/types/daily-chain.types';
import { DailySaleSummary } from '@/types/sale.types';

// ── Caché stale-while-revalidate por negocio ──
// Reglas:
//  • Cada recurso tiene su propio estado (no bloquea a los demás).
//  • TTL de 60s: dentro del TTL, usamos caché sin refetch.
//  • Fuera del TTL, servimos caché (stale) e iniciamos refetch en background.
//  • Dedupe por in-flight promise: si dos componentes piden lo mismo a la vez,
//    ejecutan una sola request.
//  • AbortController se respeta pero axios seguirá resolviendo la promesa
//    compartida; los consumidores filtran con isMountedRef.

const TTL_MS = 60_000;

type Entry<T> = {
  data: T | null;
  fetchedAt: number;
  inFlight: Promise<T> | null;
};

type CacheShape = {
  chain: Map<string, Entry<DailyChainStatus | null>>;
  sales: Map<string, Entry<DailySaleSummary | null>>;
  staffActive: Map<string, Entry<number>>;
  payrollTotal: Map<string, Entry<number>>;
};

const cache: CacheShape = {
  chain: new Map(),
  sales: new Map(),
  staffActive: new Map(),
  payrollTotal: new Map(),
};

function getEntry<T>(
  map: Map<string, Entry<T>>,
  key: string,
): Entry<T> {
  const existing = map.get(key);
  if (existing) return existing;
  const entry: Entry<T> = { data: null, fetchedAt: 0, inFlight: null };
  map.set(key, entry);
  return entry;
}

function isFresh(entry: Entry<unknown>): boolean {
  return Date.now() - entry.fetchedAt < TTL_MS;
}

async function loadResource<T>(
  map: Map<string, Entry<T>>,
  key: string,
  fetcher: () => Promise<T>,
  force: boolean,
): Promise<T | null> {
  const entry = getEntry(map, key);

  if (!force && isFresh(entry) && entry.data !== null) {
    return entry.data;
  }

  if (entry.inFlight) {
    return entry.inFlight;
  }

  const promise = fetcher()
    .then((data) => {
      entry.data = data;
      entry.fetchedAt = Date.now();
      entry.inFlight = null;
      return data;
    })
    .catch((err) => {
      entry.inFlight = null;
      throw err;
    });

  entry.inFlight = promise;
  return promise;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchChain(businessId: string) {
  return dailyChainApi.getStatus(businessId).catch(() => null);
}

async function fetchSales(businessId: string) {
  return salesApi.getDailySummary(businessId, today()).catch(() => null);
}

async function fetchStaff(businessId: string): Promise<number> {
  try {
    const staff = await staffApi.getByBusinessId(businessId);
    return staff.filter((s) => s.status === 'ACTIVE').length;
  } catch {
    return 0;
  }
}

async function fetchPayroll(businessId: string): Promise<number> {
  try {
    const payroll = await payrollApi.getUpcoming(businessId);
    const payments = [
      ...(payroll.overdue || []),
      ...(payroll.dueToday || []),
      ...(payroll.upcoming || []),
    ];
    return payments.reduce((sum, payment) => {
      const amount =
        typeof payment.amount === 'string'
          ? parseFloat(payment.amount)
          : payment.amount || 0;
      return sum + amount;
    }, 0);
  } catch {
    return 0;
  }
}

export type HomeData = {
  chain: DailyChainStatus | null;
  dailySales: DailySaleSummary | null;
  activeStaffCount: number;
  upcomingPayrollTotal: number;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
};

export function useHomeData(businessId: string | null): HomeData {
  // Estado inicial: hidrata desde caché si existe (no hay flash).
  const [chain, setChain] = useState<DailyChainStatus | null>(() =>
    businessId ? cache.chain.get(businessId)?.data ?? null : null,
  );
  const [dailySales, setDailySales] = useState<DailySaleSummary | null>(() =>
    businessId ? cache.sales.get(businessId)?.data ?? null : null,
  );
  const [activeStaffCount, setActiveStaffCount] = useState<number>(() =>
    businessId ? cache.staffActive.get(businessId)?.data ?? 0 : 0,
  );
  const [upcomingPayrollTotal, setUpcomingPayrollTotal] = useState<number>(
    () =>
      businessId ? cache.payrollTotal.get(businessId)?.data ?? 0 : 0,
  );

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(() => {
    if (!businessId) return false;
    return cache.chain.get(businessId)?.data == null;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Track del negocio para ignorar responses tardías cuando el usuario cambia
  // de negocio a mitad de fetch.
  const activeBizRef = useRef<string | null>(businessId);
  useEffect(() => {
    activeBizRef.current = businessId;
  }, [businessId]);

  const load = useCallback(
    async (bizId: string, force: boolean) => {
      const cachedChain = cache.chain.get(bizId)?.data ?? null;
      const hasCached = cachedChain !== null;

      if (hasCached) {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }

      const tasks = [
        loadResource(cache.chain, bizId, () => fetchChain(bizId), force)
          .then((data) => {
            if (activeBizRef.current !== bizId || !isMountedRef.current) return;
            setChain(data);
          })
          .catch(() => {}),
        loadResource(cache.sales, bizId, () => fetchSales(bizId), force)
          .then((data) => {
            if (activeBizRef.current !== bizId || !isMountedRef.current) return;
            setDailySales(data);
          })
          .catch(() => {}),
        loadResource(cache.staffActive, bizId, () => fetchStaff(bizId), force)
          .then((data) => {
            if (activeBizRef.current !== bizId || !isMountedRef.current) return;
            setActiveStaffCount(data ?? 0);
          })
          .catch(() => {}),
        loadResource(
          cache.payrollTotal,
          bizId,
          () => fetchPayroll(bizId),
          force,
        )
          .then((data) => {
            if (activeBizRef.current !== bizId || !isMountedRef.current) return;
            setUpcomingPayrollTotal(data ?? 0);
          })
          .catch(() => {}),
      ];

      await Promise.all(tasks);

      if (activeBizRef.current === bizId && isMountedRef.current) {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  // Hidratación de caché al cambiar de negocio: evita flash.
  useEffect(() => {
    if (!businessId) {
      setChain(null);
      setDailySales(null);
      setActiveStaffCount(0);
      setUpcomingPayrollTotal(0);
      setIsInitialLoading(false);
      return;
    }
    setChain(cache.chain.get(businessId)?.data ?? null);
    setDailySales(cache.sales.get(businessId)?.data ?? null);
    setActiveStaffCount(cache.staffActive.get(businessId)?.data ?? 0);
    setUpcomingPayrollTotal(cache.payrollTotal.get(businessId)?.data ?? 0);
    setIsInitialLoading(cache.chain.get(businessId)?.data == null);
  }, [businessId]);

  // Fetch inicial + refresh cuando TTL expira.
  useEffect(() => {
    if (!businessId) return;
    load(businessId, false);
  }, [businessId, load]);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    await load(businessId, true);
  }, [businessId, load]);

  return {
    chain,
    dailySales,
    activeStaffCount,
    upcomingPayrollTotal,
    isInitialLoading,
    isRefreshing,
    refresh,
  };
}

/**
 * Invalida la caché de un negocio. Útil tras mutaciones (crear venta,
 * firmar FOP, etc.) para que el Home vuelva a fetchear sin esperar al TTL.
 */
export function invalidateHomeCache(businessId: string): void {
  cache.chain.delete(businessId);
  cache.sales.delete(businessId);
  cache.staffActive.delete(businessId);
  cache.payrollTotal.delete(businessId);
}
