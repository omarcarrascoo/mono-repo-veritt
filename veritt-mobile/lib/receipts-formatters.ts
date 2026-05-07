import type { ReceiptStatus } from '@/types/receipt.types';

// ── Receipts formatters ───────────────────────────────────────────────
// Helpers compartidos del módulo recepciones.

export const RECEIPT_STATUS_LABEL: Record<ReceiptStatus, string> = {
  COMPLETED: 'Completada',
  PARTIAL: 'Parcial',
  CANCELLED: 'Cancelada',
};

export type ReceiptTone = 'completed' | 'partial' | 'cancelled';

export function statusToTone(status: ReceiptStatus): ReceiptTone {
  switch (status) {
    case 'COMPLETED':
      return 'completed';
    case 'PARTIAL':
      return 'partial';
    case 'CANCELLED':
    default:
      return 'cancelled';
  }
}

/** Día canónico ISO (YYYY-MM-DD) en horario local. */
export function receiptDayKey(dateStr: string): string {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  // Evitamos toISOString para no perder la zona horaria local.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dayHeaderLabel(key: string): {
  eyebrow: string;
  title: string;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${key}T12:00:00`);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );

  const formatted = target.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const titled = formatted.charAt(0).toUpperCase() + formatted.slice(1);

  if (diffDays === 0) return { eyebrow: 'Hoy', title: titled };
  if (diffDays === 1) return { eyebrow: 'Ayer', title: titled };
  if (diffDays < 7)
    return { eyebrow: `Hace ${diffDays} días`, title: titled };
  return { eyebrow: target.getFullYear().toString(), title: titled };
}

export function shortTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calcReceiptTotal(items: {
  quantityReceived: number | string;
  actualUnitCost: number | string;
}[]): number {
  return items.reduce(
    (acc, it) =>
      acc + Number(it.quantityReceived) * Number(it.actualUnitCost),
    0,
  );
}
