// ── Format helpers compartidos ───────────────────────────────────────
// Funciones puras de presentación. Stateless, testables. La regla:
// estos helpers NUNCA leen del store ni hacen i18n basado en config —
// reciben locale/currency como argumentos para que sean previsibles.

export function formatMoney(
  amount: number,
  currency = 'MXN',
  locale = 'es-MX',
): string {
  if (!Number.isFinite(amount)) return `0.00 ${currency}`;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback si el runtime no tiene Intl configurado para currency
    const sign = amount < 0 ? '-' : '';
    return `${sign}$${Math.abs(amount).toFixed(2)}`;
  }
}

/**
 * Format de cantidad con unidad. Trim de ceros decimales finales para
 * evitar "5.00 kg" cuando no aporta — pero conserva al menos un dígito.
 */
export function formatQty(value: number, unit: string): string {
  if (!Number.isFinite(value)) return `0 ${unit}`;
  const fixed = value.toFixed(2);
  const trimmed = fixed.replace(/\.?0+$/, '');
  const display = trimmed === '' || trimmed === '-' ? '0' : trimmed;
  return `${display} ${unit}`;
}

/** Format de varianza con signo explícito (`+` cuando positiva). */
export function formatVariance(value: number, unit: string): string {
  if (!Number.isFinite(value)) return `0 ${unit}`;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)} ${unit}`;
}

/** Format estable para porcentajes redondeados (`12%`, `0%`). */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}
