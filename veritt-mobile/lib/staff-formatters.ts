import { PayrollFrequency, StaffCompensation } from '@/types/staff.types';
import { formatPayrollDate } from '@/lib/payroll-utils';

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};

const FREQUENCY_LABELS: Record<PayrollFrequency, string> = {
  DAILY: 'Diario',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Cada 14 días',
  SEMIMONTHLY: 'Quincenal',
  MONTHLY: 'Mensual',
};

export function formatCurrency(
  amount: number | string,
  currency = 'MXN',
  locale = 'es-MX'
): string {
  const parsed = typeof amount === 'string' ? Number(amount) : amount;

  if (Number.isNaN(parsed)) {
    return `${amount} ${currency}`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(parsed);
  } catch {
    return `${parsed} ${currency}`;
  }
}

export function formatPayroll(compensation?: StaffCompensation | null): string {
  if (!compensation) {
    return 'Sin compensación registrada';
  }

  const amount = formatCurrency(
    compensation.salaryAmount,
    compensation.salaryCurrency
  );

  const frequency = FREQUENCY_LABELS[compensation.payrollFrequency];
  const startDateLabel = formatPayrollDate(compensation.firstPaymentDate);
  const startSuffix = startDateLabel ? ` · inicia ${startDateLabel}` : '';

  switch (compensation.payrollFrequency) {
    case 'DAILY':
      return `${amount} · ${frequency}${startSuffix}`;

    case 'WEEKLY':
      return `${amount} · ${frequency} · cada ${WEEKDAY_LABELS[compensation.weeklyPayDay ?? 1]}${startSuffix}`;

    case 'BIWEEKLY':
      return `${amount} · ${frequency}${startSuffix}`;

    case 'MONTHLY':
      return `${amount} · ${frequency} · día ${compensation.monthlyPayDay ?? '-'}${startSuffix}`;

    case 'SEMIMONTHLY':
      return `${amount} · ${frequency} · días 15 y último día${startSuffix}`;

    default:
      return `${amount} · ${frequency}${startSuffix}`;
  }
}
