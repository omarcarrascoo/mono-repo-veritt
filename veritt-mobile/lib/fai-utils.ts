import type { ChainTone } from '@/lib/daily-chain-home';

// ── Tipos del borrador ────────────────────────────────────────────────

export type FaiMaterialStatus =
  | 'pending'
  | 'counted_match'
  | 'counted_variance'
  | 'skipped';

export type FaiVarianceCause = 'merma' | 'error' | 'movement' | 'other';

export interface FaiMaterialDraft {
  materialId: string;
  name: string;
  baseUnit: string;
  category: string | null;
  systemQty: number;
  counted: number | null;
  skipped: boolean;
  cause: FaiVarianceCause | null;
  note: string;
}

export interface FaiCategoryGroup {
  name: string;
  count: number;
  pending: number;
  done: number;
  variance: number;
  skipped: number;
  items: FaiMaterialDraft[];
}

export interface FaiProgress {
  total: number;
  counted: number;
  skipped: number;
  variance: number;
  pending: number;
  /** Cuántos hay que cumplen su cuota para enviar (counted o skipped). */
  resolved: number;
  /** % del progreso global (0–100). */
  percent: number;
}

const VARIANCE_EPSILON = 0.005;

// ── Helpers ───────────────────────────────────────────────────────────

export function getMaterialStatus(item: FaiMaterialDraft): FaiMaterialStatus {
  if (item.skipped) return 'skipped';
  if (item.counted === null) return 'pending';
  return Math.abs(item.counted - item.systemQty) < VARIANCE_EPSILON
    ? 'counted_match'
    : 'counted_variance';
}

export function getVarianceValue(item: FaiMaterialDraft): number {
  if (item.counted === null || item.skipped) return 0;
  return item.counted - item.systemQty;
}

export function statusTone(status: FaiMaterialStatus): ChainTone {
  switch (status) {
    case 'counted_match':
      return 'done';
    case 'counted_variance':
      return 'review';
    case 'skipped':
      return 'blocker';
    default:
      return 'start';
  }
}

export function statusLabel(status: FaiMaterialStatus): string {
  switch (status) {
    case 'counted_match':
      return 'Coincide';
    case 'counted_variance':
      return 'Varianza';
    case 'skipped':
      return 'Saltado';
    default:
      return 'Pendiente';
  }
}

export const VARIANCE_CAUSE_OPTIONS: ReadonlyArray<{
  value: FaiVarianceCause;
  label: string;
  hint: string;
}> = [
  {
    value: 'merma',
    label: 'Merma',
    hint: 'Producto perdido, dañado o caducado.',
  },
  {
    value: 'error',
    label: 'Error de conteo',
    hint: 'Cierre anterior con número incorrecto.',
  },
  {
    value: 'movement',
    label: 'Movimiento sin registrar',
    hint: 'Salida o entrada que no se capturó.',
  },
  {
    value: 'other',
    label: 'Otra causa',
    hint: 'Explica con más detalle en la nota.',
  },
];

export function causeLabel(cause: FaiVarianceCause | null): string | null {
  return VARIANCE_CAUSE_OPTIONS.find((c) => c.value === cause)?.label ?? null;
}

/** Combina causa + nota libre en una sola string para mandar al backend. */
export function buildVarianceNote(item: FaiMaterialDraft): string | undefined {
  const note = item.note.trim();
  const cause = causeLabel(item.cause);
  if (!cause && !note) return undefined;
  if (cause && note) return `${cause} — ${note}`;
  return cause ?? note;
}

// ── Agrupación + progreso ─────────────────────────────────────────────

export function groupByCategory(
  items: FaiMaterialDraft[],
): FaiCategoryGroup[] {
  const map = new Map<string, FaiMaterialDraft[]>();
  for (const item of items) {
    const key = item.category ?? 'Sin categoría';
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  const groups: FaiCategoryGroup[] = [];
  for (const [name, list] of map.entries()) {
    let pending = 0;
    let done = 0;
    let variance = 0;
    let skipped = 0;
    for (const item of list) {
      const status = getMaterialStatus(item);
      if (status === 'pending') pending++;
      else if (status === 'counted_match') done++;
      else if (status === 'counted_variance') variance++;
      else if (status === 'skipped') skipped++;
    }
    groups.push({
      name,
      count: list.length,
      pending,
      done,
      variance,
      skipped,
      items: list,
    });
  }

  return groups.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export function calcProgress(items: FaiMaterialDraft[]): FaiProgress {
  let counted = 0;
  let skipped = 0;
  let variance = 0;
  for (const item of items) {
    const status = getMaterialStatus(item);
    if (status === 'counted_match') counted++;
    else if (status === 'counted_variance') {
      counted++;
      variance++;
    } else if (status === 'skipped') skipped++;
  }
  const total = items.length;
  const resolved = counted + skipped;
  const pending = Math.max(0, total - resolved);
  const percent = total === 0 ? 0 : Math.round((resolved / total) * 100);
  return { total, counted, skipped, variance, pending, resolved, percent };
}

// ── Navegación entre items pendientes ─────────────────────────────────

export function findFirstPendingIndex(items: FaiMaterialDraft[]): number {
  return items.findIndex((i) => getMaterialStatus(i) === 'pending');
}

/** Devuelve el siguiente índice no resuelto (para "Siguiente" en el counter). */
export function findNextPendingIndex(
  items: FaiMaterialDraft[],
  fromIndex: number,
): number {
  for (let i = fromIndex + 1; i < items.length; i++) {
    if (getMaterialStatus(items[i]) === 'pending') return i;
  }
  // Si no hay más pendientes hacia adelante, busca desde el inicio
  for (let i = 0; i < fromIndex; i++) {
    if (getMaterialStatus(items[i]) === 'pending') return i;
  }
  return -1;
}

// ── Validación pre-submit ─────────────────────────────────────────────

export interface FaiSubmitValidation {
  canSubmit: boolean;
  reasons: string[];
}

export function validateForSubmit(
  items: FaiMaterialDraft[],
): FaiSubmitValidation {
  const progress = calcProgress(items);
  const reasons: string[] = [];

  if (progress.counted === 0) {
    reasons.push('Captura al menos un conteo antes de enviar.');
  }

  const missingCause = items.filter((i) => {
    if (getMaterialStatus(i) !== 'counted_variance') return false;
    return !i.cause && !i.note.trim();
  });
  if (missingCause.length > 0) {
    reasons.push(
      missingCause.length === 1
        ? `Explica la varianza de ${missingCause[0].name}.`
        : `Explica la varianza de ${missingCause.length} materiales.`,
    );
  }

  return { canSubmit: reasons.length === 0, reasons };
}

// Re-export de los helpers compartidos para compatibilidad con callers
// que ya importan desde `@/lib/fai-utils`.
export { formatQty, formatVariance } from '@/lib/format';
