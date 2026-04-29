import { useCallback, useEffect, useRef, useState } from 'react';

import { businessesApi } from '@/api/modules/businesses.api';
import { dailyChainApi } from '@/api/modules/daily-chain.api';
import { inventoryApi } from '@/api/modules/inventory.api';
import { payrollApi } from '@/api/modules/payroll.api';
import { salesApi } from '@/api/modules/sales.api';
import { staffApi } from '@/api/modules/staff.api';
import { useBusinessStore } from '@/store/business.store';
import { permissions } from '@/lib/role-permissions';
import type { Business, BusinessOnboarding, MembershipRole } from '@/types/business.types';
import type { DailyChainStatus } from '@/types/daily-chain.types';
import type { DailySaleSummary } from '@/types/sale.types';

// ── Caché stale-while-revalidate por negocio ──
// Reglas:
//  • TTL 60s: dentro del TTL servimos caché y no refetcheamos.
//  • Fuera del TTL servimos caché (stale) e iniciamos refetch en background.
//  • Dedupe por recurso: llamadas concurrentes comparten la misma promesa.
//  • Skip de llamadas que el rol no puede ejecutar (evita 403 y tráfico).

const TTL_MS = 60_000;

type Entry<T> = {
  data: T | null;
  fetchedAt: number;
  inFlight: Promise<T> | null;
};

function makeEntry<T>(): Entry<T> {
  return { data: null, fetchedAt: 0, inFlight: null };
}

function isFresh(entry: Entry<unknown>): boolean {
  return Date.now() - entry.fetchedAt < TTL_MS;
}

type CacheShape = {
  business: Map<string, Entry<Business>>;
  onboarding: Map<string, Entry<BusinessOnboarding>>;
  chain: Map<string, Entry<DailyChainStatus | null>>;
  sales: Map<string, Entry<DailySaleSummary | null>>;
  staffActive: Map<string, Entry<number>>;
  payrollTotal: Map<string, Entry<number>>;
  inventoryCounts: Map<
    string,
    Entry<{ locations: number; products: number; materials: number }>
  >;
};

const cache: CacheShape = {
  business: new Map(),
  onboarding: new Map(),
  chain: new Map(),
  sales: new Map(),
  staffActive: new Map(),
  payrollTotal: new Map(),
  inventoryCounts: new Map(),
};

function getEntry<T>(map: Map<string, Entry<T>>, key: string): Entry<T> {
  const existing = map.get(key);
  if (existing) return existing;
  const e = makeEntry<T>();
  map.set(key, e);
  return e;
}

async function loadResource<T>(
  map: Map<string, Entry<T>>,
  key: string,
  fetcher: () => Promise<T>,
  force: boolean,
): Promise<T | null> {
  const entry = getEntry(map, key);
  if (!force && isFresh(entry) && entry.data !== null) return entry.data;
  if (entry.inFlight) return entry.inFlight;

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

async function fetchSales(businessId: string) {
  return salesApi.getDailySummary(businessId, today()).catch(() => null);
}

async function fetchStaffCount(businessId: string): Promise<number> {
  try {
    const list = await staffApi.getByBusinessId(businessId);
    return list.filter((s) => s.status === 'ACTIVE').length;
  } catch {
    return 0;
  }
}

async function fetchPayrollTotal(businessId: string): Promise<number> {
  try {
    const payroll = await payrollApi.getUpcoming(businessId);
    const payments = [
      ...(payroll.overdue ?? []),
      ...(payroll.dueToday ?? []),
      ...(payroll.upcoming ?? []),
    ];
    return payments.reduce((sum, p) => {
      const amt =
        typeof p.amount === 'string' ? parseFloat(p.amount) : p.amount || 0;
      return sum + amt;
    }, 0);
  } catch {
    return 0;
  }
}

async function fetchInventoryCounts(businessId: string) {
  try {
    const [locations, materials, products] = await Promise.all([
      inventoryApi.listLocations(businessId).catch(() => []),
      inventoryApi.listMaterials(businessId).catch(() => []),
      inventoryApi.listProducts(businessId).catch(() => []),
    ]);
    return {
      locations: locations.length,
      materials: materials.length,
      products: products.length,
    };
  } catch {
    return { locations: 0, materials: 0, products: 0 };
  }
}

export type BusinessDetailData = {
  business: Business | null;
  onboarding: BusinessOnboarding | null;
  chain: DailyChainStatus | null;
  dailySales: DailySaleSummary | null;
  activeStaffCount: number;
  upcomingPayrollTotal: number;
  inventory: { locations: number; products: number; materials: number };
  role: MembershipRole | null;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
};

export function useBusinessDetail(
  businessId: string | null,
): BusinessDetailData {
  // El rol viene del store (ya está cargado por businesses list) — evita una llamada a getMine().
  const roleFromStore = useBusinessStore((s) =>
    businessId ? s.getRole(businessId) : null,
  );

  const hydrate = useCallback(<T,>(map: Map<string, Entry<T>>): T | null => {
    if (!businessId) return null;
    return map.get(businessId)?.data ?? null;
  }, [businessId]);

  const [business, setBusiness] = useState<Business | null>(() =>
    hydrate(cache.business),
  );
  const [onboarding, setOnboarding] = useState<BusinessOnboarding | null>(
    () => hydrate(cache.onboarding),
  );
  const [chain, setChain] = useState<DailyChainStatus | null>(() =>
    hydrate(cache.chain),
  );
  const [dailySales, setDailySales] = useState<DailySaleSummary | null>(() =>
    hydrate(cache.sales),
  );
  const [activeStaffCount, setActiveStaffCount] = useState<number>(
    () => hydrate(cache.staffActive) ?? 0,
  );
  const [upcomingPayrollTotal, setUpcomingPayrollTotal] = useState<number>(
    () => hydrate(cache.payrollTotal) ?? 0,
  );
  const [inventory, setInventory] = useState(
    () =>
      hydrate(cache.inventoryCounts) ?? {
        locations: 0,
        products: 0,
        materials: 0,
      },
  );

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(() => {
    if (!businessId) return false;
    return cache.business.get(businessId)?.data == null;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Track del negocio activo para ignorar responses de uno anterior.
  const activeRef = useRef<string | null>(businessId);
  useEffect(() => {
    activeRef.current = businessId;
  }, [businessId]);

  // Rol efectivo: lo del business cacheado > lo del store > null
  const role: MembershipRole | null =
    business?.userRole ?? roleFromStore ?? null;

  const load = useCallback(
    async (bizId: string, force: boolean) => {
      const cachedBusiness = cache.business.get(bizId)?.data ?? null;
      if (cachedBusiness) setIsRefreshing(true);
      else setIsInitialLoading(true);

      // Para decidir los fetches condicionados al rol usamos el rol mejor
      // disponible AHORA: cache business > store. Si resulta distinto después
      // del refresh, el efecto se revalida al cambiar `role`.
      const effectiveRole: MembershipRole | null =
        cachedBusiness?.userRole ?? roleFromStore ?? null;
      const canFin = permissions.canSeeFinance(effectiveRole);
      const canSt = permissions.canManageStaff(effectiveRole);
      const canPay = permissions.canSeePayroll(effectiveRole);

      // Disparamos en paralelo y respetamos dedupe por recurso.
      const tasks: Promise<unknown>[] = [
        loadResource(
          cache.business,
          bizId,
          () => businessesApi.getById(bizId),
          force,
        )
          .then((data) => {
            if (activeRef.current !== bizId || !mountedRef.current) return;
            // getById no devuelve userRole — lo pegamos desde el store.
            const merged = data
              ? ({ ...data, userRole: effectiveRole } as Business)
              : null;
            // Sobrescribe la caché con el merged para que futuros hydrates tengan el rol.
            if (merged) {
              cache.business.get(bizId)!.data = merged;
            }
            setBusiness(merged);
          })
          .catch(() => {}),
        loadResource(
          cache.onboarding,
          bizId,
          () => businessesApi.getOnboarding(bizId),
          force,
        )
          .then((data) => {
            if (activeRef.current !== bizId || !mountedRef.current) return;
            setOnboarding(data);
          })
          .catch(() => {}),
        loadResource(
          cache.chain,
          bizId,
          () => dailyChainApi.getStatus(bizId).catch(() => null),
          force,
        )
          .then((data) => {
            if (activeRef.current !== bizId || !mountedRef.current) return;
            setChain(data);
          })
          .catch(() => {}),
        loadResource(
          cache.inventoryCounts,
          bizId,
          () => fetchInventoryCounts(bizId),
          force,
        )
          .then((data) => {
            if (activeRef.current !== bizId || !mountedRef.current) return;
            setInventory(
              data ?? { locations: 0, products: 0, materials: 0 },
            );
          })
          .catch(() => {}),
        canFin
          ? loadResource(cache.sales, bizId, () => fetchSales(bizId), force)
              .then((data) => {
                if (activeRef.current !== bizId || !mountedRef.current) return;
                setDailySales(data);
              })
              .catch(() => {})
          : Promise.resolve().then(() => setDailySales(null)),
        canSt
          ? loadResource(
              cache.staffActive,
              bizId,
              () => fetchStaffCount(bizId),
              force,
            )
              .then((data) => {
                if (activeRef.current !== bizId || !mountedRef.current) return;
                setActiveStaffCount(data ?? 0);
              })
              .catch(() => {})
          : Promise.resolve().then(() => setActiveStaffCount(0)),
        canPay
          ? loadResource(
              cache.payrollTotal,
              bizId,
              () => fetchPayrollTotal(bizId),
              force,
            )
              .then((data) => {
                if (activeRef.current !== bizId || !mountedRef.current) return;
                setUpcomingPayrollTotal(data ?? 0);
              })
              .catch(() => {})
          : Promise.resolve().then(() => setUpcomingPayrollTotal(0)),
      ];

      await Promise.allSettled(tasks);

      if (activeRef.current === bizId && mountedRef.current) {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [roleFromStore],
  );

  // Hidratación al cambiar de negocio: cero flash si hay caché.
  useEffect(() => {
    if (!businessId) {
      setBusiness(null);
      setOnboarding(null);
      setChain(null);
      setDailySales(null);
      setActiveStaffCount(0);
      setUpcomingPayrollTotal(0);
      setInventory({ locations: 0, products: 0, materials: 0 });
      setIsInitialLoading(false);
      return;
    }
    setBusiness(cache.business.get(businessId)?.data ?? null);
    setOnboarding(cache.onboarding.get(businessId)?.data ?? null);
    setChain(cache.chain.get(businessId)?.data ?? null);
    setDailySales(cache.sales.get(businessId)?.data ?? null);
    setActiveStaffCount(cache.staffActive.get(businessId)?.data ?? 0);
    setUpcomingPayrollTotal(cache.payrollTotal.get(businessId)?.data ?? 0);
    setInventory(
      cache.inventoryCounts.get(businessId)?.data ?? {
        locations: 0,
        products: 0,
        materials: 0,
      },
    );
    setIsInitialLoading(cache.business.get(businessId)?.data == null);
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
    business,
    onboarding,
    chain,
    dailySales,
    activeStaffCount,
    upcomingPayrollTotal,
    inventory,
    role,
    isInitialLoading,
    isRefreshing,
    refresh,
  };
}

/** Invalida la caché de un negocio. Llamar tras mutaciones. */
export function invalidateBusinessDetail(businessId: string): void {
  cache.business.delete(businessId);
  cache.onboarding.delete(businessId);
  cache.chain.delete(businessId);
  cache.sales.delete(businessId);
  cache.staffActive.delete(businessId);
  cache.payrollTotal.delete(businessId);
  cache.inventoryCounts.delete(businessId);
}
