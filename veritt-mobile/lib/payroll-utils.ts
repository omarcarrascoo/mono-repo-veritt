import { PayrollPaymentStatus } from '@/types/payroll.types';
import { PayrollFrequency } from '@/types/staff.types';

export type PayrollDateParts = {
  year: number;
  month: number;
  day: number;
};

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

export function isValidPayrollDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function isLastDayOfMonth(value: string) {
  if (!isValidPayrollDateInput(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return day === lastDay;
}

export function parsePayrollDateInput(value?: string | null): PayrollDateParts | null {
  if (!value) {
    return null;
  }

  const normalizedValue = isValidPayrollDateInput(value)
    ? value
    : isValidPayrollDateInput(value.slice(0, 10))
      ? value.slice(0, 10)
      : null;

  if (!normalizedValue) {
    return null;
  }

  const [year, month, day] = normalizedValue.split('-').map(Number);

  return { year, month, day };
}

export function getLastDayOfPayrollMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function buildPayrollDateInput(year: number, month: number, day: number) {
  return [year, padDatePart(month), padDatePart(day)].join('-');
}

export function getTodayPayrollDateInput(date = new Date()) {
  return buildPayrollDateInput(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
}

export function getNextSemimonthlyAnchorDate(value: string) {
  const parts = parsePayrollDateInput(value);

  if (!parts) {
    return '';
  }

  const { year, month, day } = parts;
  const lastDay = getLastDayOfPayrollMonth(year, month);

  if (day <= 15) {
    return buildPayrollDateInput(year, month, 15);
  }

  if (day <= lastDay) {
    return buildPayrollDateInput(year, month, lastDay);
  }

  return buildPayrollDateInput(year, month, lastDay);
}

export function isSemimonthlyAnchorDate(value: string) {
  if (!isValidPayrollDateInput(value)) {
    return false;
  }

  return value.endsWith('-15') || isLastDayOfMonth(value);
}

export function normalizePayrollDateInput(
  value: string | undefined | null,
  payrollFrequency: PayrollFrequency,
  fallbackDate = new Date()
) {
  const parsedValue = parsePayrollDateInput(value);

  if (parsedValue) {
    const normalizedValue = buildPayrollDateInput(
      parsedValue.year,
      parsedValue.month,
      parsedValue.day
    );

    if (payrollFrequency !== 'SEMIMONTHLY' || isSemimonthlyAnchorDate(normalizedValue)) {
      return normalizedValue;
    }

    return getNextSemimonthlyAnchorDate(normalizedValue);
  }

  const fallbackValue = getTodayPayrollDateInput(fallbackDate);

  return payrollFrequency === 'SEMIMONTHLY'
    ? getNextSemimonthlyAnchorDate(fallbackValue)
    : fallbackValue;
}

export function getPayrollFrequencyHint(frequency: PayrollFrequency) {
  switch (frequency) {
    case 'DAILY':
      return 'El sistema generará un pago diario a partir de la fecha del primer pago.';
    case 'WEEKLY':
      return 'El sistema repetirá el pago cada 7 días a partir del primer pago.';
    case 'BIWEEKLY':
      return 'El sistema repetirá el pago cada 14 días a partir del primer pago.';
    case 'SEMIMONTHLY':
      return 'La nómina quincenal se generará el día 15 y el último día de cada mes.';
    case 'MONTHLY':
      return 'El sistema repetirá el pago el mismo día del mes que el primer pago.';
    default:
      return '';
  }
}

function getPayrollDateForFormatting(value?: string | null) {
  const parts = parsePayrollDateInput(value);

  if (!parts) {
    return null;
  }

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
}

export function formatPayrollDate(
  value?: string | null,
  variant: 'short' | 'long' = 'short'
) {
  const parsed = getPayrollDateForFormatting(value);

  if (!parsed) return value ?? '';

  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: variant === 'long' ? 'long' : 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(parsed);
  } catch {
    return value;
  }
}

export function getPayrollWeekdayLabel(value?: string | null) {
  const parsed = getPayrollDateForFormatting(value);

  if (!parsed) {
    return '';
  }

  try {
    const label = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      timeZone: 'UTC',
    }).format(parsed);

    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return '';
  }
}

export function formatPayrollStatus(status: PayrollPaymentStatus) {
  switch (status) {
    case 'PAID':
      return 'Pagado';
    case 'OVERDUE':
      return 'Vencido';
    case 'SKIPPED':
      return 'Omitido';
    case 'CANCELED':
      return 'Cancelado';
    case 'PENDING':
    default:
      return 'Pendiente';
  }
}
