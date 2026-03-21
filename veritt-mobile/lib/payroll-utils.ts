import { PayrollPaymentStatus } from '@/types/payroll.types';
import { PayrollFrequency } from '@/types/staff.types';

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

export function isSemimonthlyAnchorDate(value: string) {
  if (!isValidPayrollDateInput(value)) {
    return false;
  }

  return value.endsWith('-15') || isLastDayOfMonth(value);
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

export function formatPayrollDate(value?: string | null) {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
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
