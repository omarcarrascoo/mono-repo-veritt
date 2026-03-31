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
