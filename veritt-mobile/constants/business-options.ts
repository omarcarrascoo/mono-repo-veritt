import type { VrittSelectOption } from '@/components/ui/VrittSelect';

export const TIMEZONE_OPTIONS: VrittSelectOption[] = [
  { label: 'Ciudad de México', value: 'America/Mexico_City', hint: 'GMT-6 / GMT-5' },
  { label: 'Cancún', value: 'America/Cancun', hint: 'GMT-5' },
  { label: 'Mérida', value: 'America/Merida', hint: 'GMT-6 / GMT-5' },
  { label: 'Tijuana', value: 'America/Tijuana', hint: 'GMT-8 / GMT-7' },
  { label: 'Los Ángeles', value: 'America/Los_Angeles', hint: 'GMT-8 / GMT-7' },
  { label: 'Nueva York', value: 'America/New_York', hint: 'GMT-5 / GMT-4' },
  { label: 'Bogotá', value: 'America/Bogota', hint: 'GMT-5' },
  { label: 'Lima', value: 'America/Lima', hint: 'GMT-5' },
  { label: 'Madrid', value: 'Europe/Madrid', hint: 'GMT+1 / GMT+2' },
  { label: 'Londres', value: 'Europe/London', hint: 'GMT / GMT+1' },
  { label: 'UTC', value: 'UTC', hint: 'Universal' },
];

export const CUTOFF_HOUR_OPTIONS: VrittSelectOption[] = Array.from(
  { length: 24 },
  (_, hour) => ({
    label: `${hour.toString().padStart(2, '0')}:00`,
    value: String(hour),
    hint:
      hour === 4
        ? 'Recomendado para operación nocturna'
        : undefined,
  })
);