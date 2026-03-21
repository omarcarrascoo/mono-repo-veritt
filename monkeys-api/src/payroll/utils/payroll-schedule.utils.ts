import { BadRequestException } from '@nestjs/common';
import { PayrollFrequency } from '@prisma/client';

type ScheduleInput = {
  payrollFrequency: PayrollFrequency;
  firstPaymentDate: string | Date;
  weeklyPayDay?: number | null;
  monthlyPayDay?: number | null;
  semimonthlyFirstDay?: number | null;
  semimonthlySecondDay?: number | null;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  const cacheKey = timeZone;

  if (!formatterCache.has(cacheKey)) {
    formatterCache.set(
      cacheKey,
      new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    );
  }

  return formatterCache.get(cacheKey)!;
}

export function dateToDateKey(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function dateKeyToDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function parseDateKey(value: string | Date) {
  if (value instanceof Date) {
    return dateToDateKey(value);
  }

  return value.slice(0, 10);
}

export function getDatePartsFromDateKey(dateKey: string): DateParts {
  const [year, month, day] = dateKey.split('-').map(Number);

  return { year, month, day };
}

export function getDateKeyInTimeZone(date: Date, timeZone: string) {
  const parts = getFormatter(timeZone).formatToParts(date);

  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return [
    year,
    String(month).padStart(2, '0'),
    String(day).padStart(2, '0'),
  ].join('-');
}

export function getTodayDateKey(timeZone: string, now = new Date()) {
  return getDateKeyInTimeZone(now, timeZone);
}

export function addDays(dateKey: string, amount: number) {
  const next = dateKeyToDate(dateKey);
  next.setUTCDate(next.getUTCDate() + amount);
  return dateToDateKey(next);
}

export function compareDateKeys(left: string, right: string) {
  return left.localeCompare(right);
}

export function maxDateKey(left: string, right: string) {
  return compareDateKeys(left, right) >= 0 ? left : right;
}

export function getLastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function normalizeDayForMonth(year: number, month: number, day: number) {
  return Math.min(day, getLastDayOfMonth(year, month));
}

export function isLastDayOfMonth(dateKey: string) {
  const { year, month, day } = getDatePartsFromDateKey(dateKey);
  return day === getLastDayOfMonth(year, month);
}

export function getIsoWeekday(dateKey: string) {
  const weekday = dateKeyToDate(dateKey).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function assertValidFirstPaymentDate(payrollFrequency: PayrollFrequency, firstPaymentDate: string) {
  if (payrollFrequency !== 'SEMIMONTHLY') {
    return;
  }

  const { day } = getDatePartsFromDateKey(firstPaymentDate);

  if (day !== 15 && !isLastDayOfMonth(firstPaymentDate)) {
    throw new BadRequestException(
      'Semimonthly payroll requires the first payment date to be the 15th or the last day of the month',
    );
  }
}

export function deriveScheduleFields(input: ScheduleInput) {
  const firstPaymentDate = parseDateKey(input.firstPaymentDate);
  const { day } = getDatePartsFromDateKey(firstPaymentDate);
  const isoWeekday = getIsoWeekday(firstPaymentDate);

  switch (input.payrollFrequency) {
    case 'WEEKLY':
      return {
        firstPaymentDate,
        weeklyPayDay: isoWeekday,
        monthlyPayDay: null,
        semimonthlyFirstDay: null,
        semimonthlySecondDay: null,
      };
    case 'BIWEEKLY':
      return {
        firstPaymentDate,
        weeklyPayDay: isoWeekday,
        monthlyPayDay: null,
        semimonthlyFirstDay: null,
        semimonthlySecondDay: null,
      };
    case 'MONTHLY':
      return {
        firstPaymentDate,
        weeklyPayDay: null,
        monthlyPayDay: day,
        semimonthlyFirstDay: null,
        semimonthlySecondDay: null,
      };
    case 'SEMIMONTHLY':
      return {
        firstPaymentDate,
        weeklyPayDay: null,
        monthlyPayDay: null,
        semimonthlyFirstDay: 15,
        semimonthlySecondDay: 31,
      };
    case 'DAILY':
    default:
      return {
        firstPaymentDate,
        weeklyPayDay: null,
        monthlyPayDay: null,
        semimonthlyFirstDay: null,
        semimonthlySecondDay: null,
      };
  }
}

function generateByFixedStep(
  firstPaymentDate: string,
  rangeStart: string,
  rangeEnd: string,
  stepInDays: number,
) {
  const dueDates: string[] = [];

  for (
    let cursor = firstPaymentDate;
    compareDateKeys(cursor, rangeEnd) <= 0;
    cursor = addDays(cursor, stepInDays)
  ) {
    if (compareDateKeys(cursor, rangeStart) >= 0) {
      dueDates.push(cursor);
    }
  }

  return dueDates;
}

function pushIfInRange(
  dueDates: string[],
  candidate: string,
  firstPaymentDate: string,
  rangeStart: string,
  rangeEnd: string,
) {
  if (compareDateKeys(candidate, firstPaymentDate) < 0) {
    return;
  }

  if (compareDateKeys(candidate, rangeStart) < 0) {
    return;
  }

  if (compareDateKeys(candidate, rangeEnd) > 0) {
    return;
  }

  dueDates.push(candidate);
}

export function generateDueDateKeys(input: ScheduleInput, rangeStart: string, rangeEnd: string) {
  const firstPaymentDate = parseDateKey(input.firstPaymentDate);

  if (compareDateKeys(rangeStart, rangeEnd) > 0) {
    return [];
  }

  switch (input.payrollFrequency) {
    case 'DAILY':
      return generateByFixedStep(firstPaymentDate, rangeStart, rangeEnd, 1);
    case 'WEEKLY':
      return generateByFixedStep(firstPaymentDate, rangeStart, rangeEnd, 7);
    case 'BIWEEKLY':
      return generateByFixedStep(firstPaymentDate, rangeStart, rangeEnd, 14);
    case 'MONTHLY': {
      const dueDates: string[] = [];
      const anchorDay = input.monthlyPayDay ?? getDatePartsFromDateKey(firstPaymentDate).day;
      const startParts = getDatePartsFromDateKey(firstPaymentDate);
      const endParts = getDatePartsFromDateKey(rangeEnd);

      for (
        let year = startParts.year, month = startParts.month;
        year < endParts.year || (year === endParts.year && month <= endParts.month);
      ) {
        const dueDay = normalizeDayForMonth(year, month, anchorDay);
        const candidate = [
          year,
          String(month).padStart(2, '0'),
          String(dueDay).padStart(2, '0'),
        ].join('-');

        pushIfInRange(dueDates, candidate, firstPaymentDate, rangeStart, rangeEnd);

        if (month === 12) {
          year += 1;
          month = 1;
        } else {
          month += 1;
        }
      }

      return dueDates;
    }
    case 'SEMIMONTHLY': {
      const dueDates: string[] = [];
      const firstDay = input.semimonthlyFirstDay ?? 15;
      const secondDay = input.semimonthlySecondDay ?? 31;
      const startParts = getDatePartsFromDateKey(firstPaymentDate);
      const endParts = getDatePartsFromDateKey(rangeEnd);

      for (
        let year = startParts.year, month = startParts.month;
        year < endParts.year || (year === endParts.year && month <= endParts.month);
      ) {
        const candidates = Array.from(
          new Set([
            normalizeDayForMonth(year, month, firstDay),
            normalizeDayForMonth(year, month, secondDay),
          ]),
        ).sort((left, right) => left - right);

        for (const dueDay of candidates) {
          const candidate = [
            year,
            String(month).padStart(2, '0'),
            String(dueDay).padStart(2, '0'),
          ].join('-');

          pushIfInRange(dueDates, candidate, firstPaymentDate, rangeStart, rangeEnd);
        }

        if (month === 12) {
          year += 1;
          month = 1;
        } else {
          month += 1;
        }
      }

      return dueDates;
    }
    default:
      return [];
  }
}
