import { formatCurrency } from '@/lib/staff-formatters'
import {
  DecimalValue,
  InventoryLocationType,
  InventoryStatus,
  ProductType,
} from '@/types/inventory.types'

const LOCATION_TYPE_LABELS: Record<InventoryLocationType, string> = {
  MAIN: 'Principal',
  WAREHOUSE: 'Almacén',
  RESTAURANT: 'Restaurante',
  KITCHEN: 'Cocina',
  OTHER: 'Otro',
}

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  DIRECT: 'Directo',
  RECIPE: 'Con receta',
}

const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  ARCHIVED: 'Archivado',
}

export function toInventoryNumber(value?: DecimalValue | null): number {
  if (value === null || value === undefined || value === '') {
    return 0
  }

  const parsed = typeof value === 'string' ? Number(value) : value

  return Number.isFinite(parsed) ? parsed : 0
}

export function formatInventoryQuantity(value: DecimalValue, unit?: string): string {
  const parsed = toInventoryNumber(value)
  const formatted = new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: parsed % 1 === 0 ? 0 : 4,
  }).format(parsed)

  return unit ? `${formatted} ${unit}` : formatted
}

export function formatInventoryCurrency(
  amount: DecimalValue,
  currency = 'MXN'
): string {
  return formatCurrency(toInventoryNumber(amount), currency)
}

export function formatLocationType(type: InventoryLocationType): string {
  return LOCATION_TYPE_LABELS[type] ?? type
}

export function formatProductType(type: ProductType): string {
  return PRODUCT_TYPE_LABELS[type] ?? type
}

export function formatInventoryStatus(status: InventoryStatus): string {
  return INVENTORY_STATUS_LABELS[status] ?? status
}

// ── Stock semantics ────────────────────────────────────────────────────
// Tono de stock unificado (sin importar si es material o producto).

export type StockTone = 'ok' | 'low' | 'out'

export interface StockHealth {
  tone: StockTone
  label: string
  /** Porcentaje 0..1 respecto al mínimo (cap a 1). 0 si no hay mínimo. */
  ratio: number
}

/**
 * Calcula la salud del stock: si está agotado (<=0), bajo el mínimo, o sano.
 * `ratio` se calcula como current/min capped a 1, o 1 si min es 0 y hay stock.
 */
export function getStockHealth(
  current: DecimalValue,
  min: DecimalValue,
): StockHealth {
  const c = toInventoryNumber(current)
  const m = toInventoryNumber(min)
  if (c <= 0) {
    return { tone: 'out', label: 'Agotado', ratio: 0 }
  }
  if (m > 0 && c <= m) {
    return { tone: 'low', label: 'Stock bajo', ratio: Math.max(0.05, c / m) }
  }
  if (m > 0) {
    return { tone: 'ok', label: 'Disponible', ratio: Math.min(1, c / m) }
  }
  return { tone: 'ok', label: 'Disponible', ratio: 1 }
}

/** Valor de inventario = stock × costo unitario, en moneda base. */
export function valueOfMaterial(
  current: DecimalValue,
  unitCost: DecimalValue,
): number {
  return toInventoryNumber(current) * toInventoryNumber(unitCost)
}

/** Margen absoluto y % sobre precio de venta. */
export function calcProductMargin(
  salePrice: DecimalValue,
  cost: DecimalValue,
): { absolute: number; percent: number } {
  const sp = toInventoryNumber(salePrice)
  const c = toInventoryNumber(cost)
  const absolute = sp - c
  const percent = sp > 0 ? (absolute / sp) * 100 : 0
  return { absolute, percent }
}
