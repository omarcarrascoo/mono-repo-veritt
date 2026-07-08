import { useCallback, useEffect, useRef, useState } from 'react';

import { apiClient } from '@/api/client';
import { areasApi } from '@/api/modules/areas.api';
import { paymentMethodsApi } from '@/api/modules/payment-methods.api';
import { staffApi } from '@/api/modules/staff.api';
import type { Product } from '@/types/inventory.types';
import type { PaymentMethod } from '@/types/payment-method.types';
import type { StaffProfile } from '@/types/staff.types';
import type { Area } from '@/types/area.types';
import type { MembershipRole } from '@/types/business.types';
import { permissions } from '@/lib/role-permissions';

// ── Cache stale-while-revalidate por negocio ─────────────────────────
// Reglas: TTL 60s, dedupe por recurso, skip por rol.

const TTL_MS = 60_000;

type Entry<T> = {
  data: T | null;
  fetchedAt: number;
  inFlight: Promise<T> | null;
};
function makeEntry<T>(): Entry<T> {
  return { data: null, fetchedAt: 0, inFlight: null };
}
function isFresh(e: Entry<unknown>): boolean {
  return Date.now() - e.fetchedAt < TTL_MS;
}

const cache = {
  products: new Map<string, Entry<Product[]>>(),
  paymentMethods: new Map<string, Entry<PaymentMethod[]>>(),
  staff: new Map<string, Entry<StaffProfile[]>>(),
  areas: new Map<string, Entry<Area[]>>(),
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

async function fetchProducts(businessId: string): Promise<Product[]> {
  const res = await apiClient.get<Product[]>(
    `/businesses/${businessId}/inventory/products`,
  );
  return res.data.filter((p) => p.status === 'ACTIVE');
}

async function fetchPaymentMethods(businessId: string): Promise<PaymentMethod[]> {
  const list = await paymentMethodsApi.list(businessId);
  return list.filter((m) => m.status === 'ACTIVE');
}

async function fetchStaff(businessId: string): Promise<StaffProfile[]> {
  const list = await staffApi.getByBusinessId(businessId);
  return list.filter((s) => s.status === 'ACTIVE');
}

async function fetchAreas(businessId: string): Promise<Area[]> {
  const list = await areasApi.list(businessId);
  return list.filter((a) => a.status === 'ACTIVE');
}

export type PosData = {
  products: Product[];
  paymentMethods: PaymentMethod[];
  staff: StaffProfile[];
  areas: Area[];
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
};

export function usePosData(
  businessId: string | null,
  role: MembershipRole | null,
): PosData {
  const hydrate = useCallback(
    <T,>(map: Map<string, Entry<T>>): T | null => {
      if (!businessId) return null;
      return map.get(businessId)?.data ?? null;
    },
    [businessId],
  );

  const [products, setProducts] = useState<Product[]>(
    () => hydrate(cache.products) ?? [],
  );
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(
    () => hydrate(cache.paymentMethods) ?? [],
  );
  const [staff, setStaff] = useState<StaffProfile[]>(
    () => hydrate(cache.staff) ?? [],
  );
  const [areas, setAreas] = useState<Area[]>(() => hydrate(cache.areas) ?? []);

  const [isLoading, setIsLoading] = useState(() => {
    if (!businessId) return false;
    return (
      cache.products.get(businessId)?.data == null ||
      cache.paymentMethods.get(businessId)?.data == null
    );
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const activeRef = useRef<string | null>(businessId);
  useEffect(() => {
    activeRef.current = businessId;
  }, [businessId]);

  const canStaff = permissions.canManageStaff(role);
  const canConfig = permissions.canAccessConfig(role);

  const load = useCallback(
    async (bizId: string, force: boolean) => {
      const hasBasics =
        cache.products.get(bizId)?.data != null &&
        cache.paymentMethods.get(bizId)?.data != null;
      if (hasBasics) setIsRefreshing(true);
      else setIsLoading(true);

      // Usamos allSettled → una falla no bloquea lo demás (fix del timeout).
      await Promise.allSettled([
        loadResource(cache.products, bizId, () => fetchProducts(bizId), force)
          .then((data) => {
            if (activeRef.current !== bizId || !mountedRef.current) return;
            setProducts(data ?? []);
          })
          .catch(() => {}),
        loadResource(
          cache.paymentMethods,
          bizId,
          () => fetchPaymentMethods(bizId),
          force,
        )
          .then((data) => {
            if (activeRef.current !== bizId || !mountedRef.current) return;
            setPaymentMethods(data ?? []);
          })
          .catch(() => {}),
        canStaff
          ? loadResource(cache.staff, bizId, () => fetchStaff(bizId), force)
              .then((data) => {
                if (activeRef.current !== bizId || !mountedRef.current) return;
                setStaff(data ?? []);
              })
              .catch(() => {})
          : Promise.resolve().then(() => setStaff([])),
        canConfig
          ? loadResource(cache.areas, bizId, () => fetchAreas(bizId), force)
              .then((data) => {
                if (activeRef.current !== bizId || !mountedRef.current) return;
                setAreas(data ?? []);
              })
              .catch(() => {})
          : Promise.resolve().then(() => setAreas([])),
      ]);

      if (activeRef.current === bizId && mountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [canStaff, canConfig],
  );

  useEffect(() => {
    if (!businessId) return;
    load(businessId, false);
  }, [businessId, load]);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    await load(businessId, true);
  }, [businessId, load]);

  return {
    products,
    paymentMethods,
    staff,
    areas,
    isLoading,
    isRefreshing,
    refresh,
  };
}

export function invalidatePosData(businessId: string): void {
  cache.products.delete(businessId);
  cache.paymentMethods.delete(businessId);
  cache.staff.delete(businessId);
  cache.areas.delete(businessId);
}
