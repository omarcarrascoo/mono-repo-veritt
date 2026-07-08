import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { storage } from '@/utils/secure-storage';
import { notify } from '@/lib/notify';
import type { Material } from '@/types/inventory.types';
import type {
  FaiMaterialDraft,
  FaiVarianceCause,
} from '@/lib/fai-utils';

// ── Persistencia local del borrador FAI ───────────────────────────────
// Sobrevive a fondo / cierre de app sin enviar. Una vez enviado se borra.
// La clave incluye businessId + locationId + fecha operativa para evitar
// pisar conteos de otro día u otro almacén.

const DRAFT_VERSION = 1;
const DEBOUNCE_MS = 350;

interface DraftPayload {
  v: number;
  savedAt: number;
  items: Array<{
    materialId: string;
    counted: number | null;
    skipped: boolean;
    cause: FaiVarianceCause | null;
    note: string;
  }>;
}

export type DailyCountKind = 'fai' | 'fci';

function buildKey(
  kind: DailyCountKind,
  businessId: string,
  locationId: string,
  date: string,
): string {
  return `veritt.${kind}.draft.${businessId}.${locationId}.${date}`;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function buildInitialItems(
  materials: Material[],
  systemQtyOverrides?: Record<string, number>,
): FaiMaterialDraft[] {
  return materials
    .filter((m) => m.status === 'ACTIVE')
    .map<FaiMaterialDraft>((m) => ({
      materialId: m.id,
      name: m.name,
      baseUnit: m.baseUnit,
      category: m.category ?? null,
      systemQty:
        systemQtyOverrides?.[m.id] !== undefined
          ? Number(systemQtyOverrides[m.id])
          : Number(m.currentStock ?? 0),
      counted: null,
      skipped: false,
      cause: null,
      note: '',
    }))
    .sort((a, b) => {
      // Stable: primero categoría, luego nombre
      const ca = a.category ?? 'zzz';
      const cb = b.category ?? 'zzz';
      const byCat = ca.localeCompare(cb, 'es');
      if (byCat !== 0) return byCat;
      return a.name.localeCompare(b.name, 'es');
    });
}

function mergeWithDraft(
  fresh: FaiMaterialDraft[],
  payload: DraftPayload | null,
): FaiMaterialDraft[] {
  if (!payload || payload.v !== DRAFT_VERSION) return fresh;
  const byId = new Map(payload.items.map((i) => [i.materialId, i]));
  return fresh.map((item) => {
    const persisted = byId.get(item.materialId);
    if (!persisted) return item;
    return {
      ...item,
      counted: persisted.counted,
      skipped: persisted.skipped,
      cause: persisted.cause,
      note: persisted.note,
    };
  });
}

function toPayload(items: FaiMaterialDraft[]): DraftPayload {
  return {
    v: DRAFT_VERSION,
    savedAt: Date.now(),
    items: items.map((i) => ({
      materialId: i.materialId,
      counted: i.counted,
      skipped: i.skipped,
      cause: i.cause,
      note: i.note,
    })),
  };
}

export interface UseFaiDraftArgs {
  businessId: string | null;
  locationId: string | null;
  date?: string;
  materials: Material[];
  /** Mientras `false`, el hook no hidrata desde storage. Útil mientras se cargan
   *  los materiales del backend para evitar pisar el draft con un array vacío. */
  ready: boolean;
  /** Tipo de conteo — define la storage key (fai apertura vs fci cierre). Default: "fai". */
  kind?: DailyCountKind;
  /** Override opcional para `systemQty` por materialId. Útil en FCI: la cantidad
   *  esperada es la apertura registrada, no el `currentStock` del backend. */
  systemQtyOverrides?: Record<string, number>;
}

export interface UseFaiDraftReturn {
  items: FaiMaterialDraft[];
  isHydrated: boolean;
  hasDraft: boolean;
  setCount: (materialId: string, value: number | null) => void;
  setSkipped: (materialId: string, skipped: boolean) => void;
  setCause: (materialId: string, cause: FaiVarianceCause | null) => void;
  setNote: (materialId: string, note: string) => void;
  resetItem: (materialId: string) => void;
  clearAll: () => Promise<void>;
}

export function useFaiDraft({
  businessId,
  locationId,
  date,
  materials,
  ready,
  kind = 'fai',
  systemQtyOverrides,
}: UseFaiDraftArgs): UseFaiDraftReturn {
  const operationalDate = date ?? todayISO();
  const key =
    businessId && locationId
      ? buildKey(kind, businessId, locationId, operationalDate)
      : null;

  const [items, setItems] = useState<FaiMaterialDraft[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  // Huella estable del set de materiales activos. Si el padre re-renderiza
  // con un array nuevo cuyo contenido es idéntico, NO queremos re-hidratar.
  // El effect de hidratación depende de esta string en lugar del array.
  const materialsSignature = useMemo(() => {
    return materials
      .filter((m) => m.status === 'ACTIVE')
      .map((m) => m.id)
      .sort()
      .join('|');
  }, [materials]);

  // Huella del override map — evita re-hidratar si cambia la referencia pero
  // no el contenido (e.g., padre construye un objeto nuevo en cada render).
  const overridesSignature = useMemo(() => {
    if (!systemQtyOverrides) return '';
    return Object.keys(systemQtyOverrides)
      .sort()
      .map((k) => `${k}:${systemQtyOverrides[k]}`)
      .join('|');
  }, [systemQtyOverrides]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyRef = useRef<string | null>(null);

  // Hydratar desde storage cuando cambia la `signature` del set, o la key.
  // Usar `materials` directo aquí causaba re-hidratación en cualquier render
  // del padre con un array nuevo (incluso con contenido idéntico).
  useEffect(() => {
    let cancelled = false;
    if (!ready || !key) return;
    setIsHydrated(false);
    keyRef.current = key;

    const fresh = buildInitialItems(materials, systemQtyOverrides);
    (async () => {
      let payload: DraftPayload | null = null;
      try {
        const raw = await storage.getItem(key);
        if (raw) payload = JSON.parse(raw) as DraftPayload;
      } catch {
        payload = null;
      }
      if (cancelled || keyRef.current !== key) return;
      const merged = mergeWithDraft(fresh, payload);
      setItems(merged);
      setHasDraft(
        !!payload &&
          payload.items.some(
            (i) => i.counted !== null || i.skipped || i.note.length > 0,
          ),
      );
      setIsHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
    // `materials` se lee dentro pero NO depende del effect — solo refresca
    // cuando el set de IDs cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key, materialsSignature, overridesSignature]);

  // Persistencia con debounce — corre sólo después de hidratar
  // El error se notifica una sola vez por sesión: si SecureStore falla
  // (cuota llena, keychain bloqueado), no queremos spamear toasts.
  const writeFailedRef = useRef(false);
  useEffect(() => {
    if (!isHydrated || !key) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const hasContent = items.some(
        (i) => i.counted !== null || i.skipped || i.note.length > 0,
      );
      if (!hasContent) {
        // Si vaciamos todo, limpiamos el storage en lugar de persistir basura
        storage.removeItem(key).catch(() => {});
        setHasDraft(false);
        return;
      }
      storage
        .setItem(key, JSON.stringify(toPayload(items)))
        .then(() => {
          setHasDraft(true);
          writeFailedRef.current = false;
        })
        .catch(() => {
          if (writeFailedRef.current) return;
          writeFailedRef.current = true;
          notify.warning(
            'Borrador no se está guardando',
            'Si cierras la app puedes perder el conteo. Termina y envía pronto.',
          );
        });
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [items, isHydrated, key]);

  const setCount = useCallback(
    (materialId: string, value: number | null) => {
      setItems((prev) =>
        prev.map((i) =>
          i.materialId === materialId
            ? {
                ...i,
                counted: value,
                // Si pone valor, deja de estar saltado
                skipped: value !== null ? false : i.skipped,
                // Si vuelve a coincidir con sistema, limpia causa/nota.
                ...(value !== null &&
                Math.abs(value - i.systemQty) < 0.005
                  ? { cause: null, note: '' }
                  : null),
              }
            : i,
        ),
      );
    },
    [],
  );

  const setSkipped = useCallback((materialId: string, skipped: boolean) => {
    setItems((prev) =>
      prev.map((i) =>
        i.materialId === materialId
          ? {
              ...i,
              skipped,
              counted: skipped ? null : i.counted,
              cause: skipped ? null : i.cause,
              note: skipped ? '' : i.note,
            }
          : i,
      ),
    );
  }, []);

  const setCause = useCallback(
    (materialId: string, cause: FaiVarianceCause | null) => {
      setItems((prev) =>
        prev.map((i) =>
          i.materialId === materialId ? { ...i, cause } : i,
        ),
      );
    },
    [],
  );

  const setNote = useCallback((materialId: string, note: string) => {
    setItems((prev) =>
      prev.map((i) => (i.materialId === materialId ? { ...i, note } : i)),
    );
  }, []);

  const resetItem = useCallback((materialId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.materialId === materialId
          ? { ...i, counted: null, skipped: false, cause: null, note: '' }
          : i,
      ),
    );
  }, []);

  const clearAll = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (key) {
      try {
        await storage.removeItem(key);
      } catch {
        // ignore
      }
    }
    setHasDraft(false);
    if (materials.length > 0) {
      setItems(buildInitialItems(materials, systemQtyOverrides));
    }
  }, [key, materials, systemQtyOverrides]);

  return {
    items,
    isHydrated,
    hasDraft,
    setCount,
    setSkipped,
    setCause,
    setNote,
    resetItem,
    clearAll,
  };
}
