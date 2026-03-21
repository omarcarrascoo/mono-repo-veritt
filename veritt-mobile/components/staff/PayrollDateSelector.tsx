import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { VrittSelect } from '@/components/ui/VrittSelect';
import {
  buildPayrollDateInput,
  formatPayrollDate,
  getLastDayOfPayrollMonth,
  getPayrollWeekdayLabel,
  normalizePayrollDateInput,
  parsePayrollDateInput,
} from '@/lib/payroll-utils';
import { PayrollFrequency } from '@/types/staff.types';

type PayrollDateSelectorProps = {
  value: string;
  payrollFrequency: PayrollFrequency;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const MONTH_OPTIONS = [
  { label: 'Enero', value: '01' },
  { label: 'Febrero', value: '02' },
  { label: 'Marzo', value: '03' },
  { label: 'Abril', value: '04' },
  { label: 'Mayo', value: '05' },
  { label: 'Junio', value: '06' },
  { label: 'Julio', value: '07' },
  { label: 'Agosto', value: '08' },
  { label: 'Septiembre', value: '09' },
  { label: 'Octubre', value: '10' },
  { label: 'Noviembre', value: '11' },
  { label: 'Diciembre', value: '12' },
] as const;

type SemimonthlyMode = '15' | 'LAST';

function getDayValue(day: number) {
  return String(day).padStart(2, '0');
}

function getScheduleSummary(value: string, payrollFrequency: PayrollFrequency) {
  const parts = parsePayrollDateInput(value);

  if (!parts) {
    return '';
  }

  switch (payrollFrequency) {
    case 'DAILY':
      return 'A partir de esta fecha se generará un pago diario.';
    case 'WEEKLY':
      return `Se repetirá cada ${getPayrollWeekdayLabel(value)}.`;
    case 'BIWEEKLY':
      return 'Se repetirá cada 14 días a partir de esta fecha.';
    case 'MONTHLY':
      return `Después se repetirá el día ${parts.day} de cada mes.`;
    case 'SEMIMONTHLY':
      return 'Después seguirá el día 15 y el último día de cada mes.';
    default:
      return '';
  }
}

export function PayrollDateSelector({
  value,
  payrollFrequency,
  onChange,
  disabled = false,
}: PayrollDateSelectorProps) {
  const normalizedValue = useMemo(
    () => normalizePayrollDateInput(value, payrollFrequency),
    [payrollFrequency, value]
  );

  const selectedParts = useMemo(() => {
    const parsed = parsePayrollDateInput(normalizedValue);

    if (!parsed) {
      return parsePayrollDateInput(normalizePayrollDateInput('', payrollFrequency))!;
    }

    return parsed;
  }, [normalizedValue, payrollFrequency]);

  const currentYear = new Date().getFullYear();
  const selectedMonthLabel =
    MONTH_OPTIONS.find((option) => option.value === getDayValue(selectedParts.month))?.label ??
    'Mes';
  const lastDayOfMonth = getLastDayOfPayrollMonth(selectedParts.year, selectedParts.month);
  const semimonthlyMode: SemimonthlyMode = selectedParts.day === 15 ? '15' : 'LAST';

  const yearOptions = useMemo(() => {
    const firstYear = Math.min(currentYear - 1, selectedParts.year - 1);
    const lastYear = Math.max(currentYear + 4, selectedParts.year + 4);

    return Array.from({ length: lastYear - firstYear + 1 }, (_, index) => {
      const optionYear = firstYear + index;

      return {
        label: String(optionYear),
        value: String(optionYear),
      };
    });
  }, [currentYear, selectedParts.year]);

  const dayOptions = useMemo(
    () =>
      Array.from({ length: lastDayOfMonth }, (_, index) => {
        const day = index + 1;

        return {
          label: `Día ${day}`,
          value: getDayValue(day),
        };
      }),
    [lastDayOfMonth]
  );

  const applyDateChange = (year: number, month: number, day: number) => {
    onChange(buildPayrollDateInput(year, month, day));
  };

  const handleYearChange = (yearValue: string) => {
    const year = Number(yearValue);
    const nextDay =
      payrollFrequency === 'SEMIMONTHLY'
        ? semimonthlyMode === 'LAST'
          ? getLastDayOfPayrollMonth(year, selectedParts.month)
          : 15
        : Math.min(selectedParts.day, getLastDayOfPayrollMonth(year, selectedParts.month));

    applyDateChange(year, selectedParts.month, nextDay);
  };

  const handleMonthChange = (monthValue: string) => {
    const month = Number(monthValue);
    const nextDay =
      payrollFrequency === 'SEMIMONTHLY'
        ? semimonthlyMode === 'LAST'
          ? getLastDayOfPayrollMonth(selectedParts.year, month)
          : 15
        : Math.min(selectedParts.day, getLastDayOfPayrollMonth(selectedParts.year, month));

    applyDateChange(selectedParts.year, month, nextDay);
  };

  const handleDayChange = (dayValue: string) => {
    applyDateChange(selectedParts.year, selectedParts.month, Number(dayValue));
  };

  const handleSemimonthlyModeChange = (mode: SemimonthlyMode) => {
    applyDateChange(
      selectedParts.year,
      selectedParts.month,
      mode === 'LAST' ? lastDayOfMonth : 15
    );
  };

  return (
    <View className="gap-4">
      <View className="rounded-veritt border border-veritt-border bg-veritt-surfaceSoft px-4 py-4">
        <Text className="text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
          Primer pago
        </Text>
        <Text className="mt-2 text-[18px] font-bold capitalize text-veritt-text">
          {formatPayrollDate(normalizedValue, 'long')}
        </Text>
        <Text className="mt-1 text-[13px] leading-[20px] text-veritt-muted">
          {getScheduleSummary(normalizedValue, payrollFrequency)}
        </Text>
      </View>

      <View className="gap-4 md:flex-row">
        <View className="md:flex-1">
          <VrittSelect
            label="Año"
            value={String(selectedParts.year)}
            options={yearOptions}
            onChange={handleYearChange}
            disabled={disabled}
          />
        </View>

        <View className="md:flex-1">
          <VrittSelect
            label="Mes"
            value={getDayValue(selectedParts.month)}
            options={MONTH_OPTIONS.map((option) => ({ ...option }))}
            onChange={handleMonthChange}
            disabled={disabled}
          />
        </View>
      </View>

      {payrollFrequency === 'SEMIMONTHLY' ? (
        <View className="rounded-veritt border border-veritt-border bg-veritt-surface px-4 pt-[14px] pb-[12px]">
          <Text className="mb-3 text-[11px] font-bold uppercase tracking-[1px] text-veritt-mutedSoft">
            Corte inicial
          </Text>

          <View className="flex-row flex-wrap gap-2">
            {[
              {
                value: '15' as const,
                title: `15 de ${selectedMonthLabel}`,
                hint: 'Mitad de mes',
              },
              {
                value: 'LAST' as const,
                title: `${lastDayOfMonth} de ${selectedMonthLabel}`,
                hint: 'Último día del mes',
              },
            ].map((option) => {
              const selected = option.value === semimonthlyMode;

              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.9}
                  disabled={disabled}
                  onPress={() => handleSemimonthlyModeChange(option.value)}
                  className={`min-w-[150px] flex-1 rounded-[18px] border px-4 py-3 ${
                    selected
                      ? 'border-veritt-borderStrong bg-[#151515]'
                      : 'border-veritt-border bg-veritt-surfaceSoft'
                  } ${disabled ? 'opacity-70' : ''}`}
                >
                  <Text className="text-[14px] font-semibold text-veritt-text">
                    {option.title}
                  </Text>
                  <Text className="mt-1 text-[12px] text-veritt-muted">
                    {option.hint}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="mt-3 text-[12px] leading-[18px] text-veritt-muted">
            Esta opción siempre respeta la lógica quincenal de pago el día 15 y al cierre del mes.
          </Text>
        </View>
      ) : (
        <VrittSelect
          label={payrollFrequency === 'MONTHLY' ? 'Día del mes' : 'Día'}
          value={getDayValue(selectedParts.day)}
          options={dayOptions}
          onChange={handleDayChange}
          disabled={disabled}
        />
      )}
    </View>
  );
}
