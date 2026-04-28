/**
 * Calculates the operational date based on the business's cutoff hour.
 *
 * If the current time is before the cutoff hour, the operational date
 * is the previous calendar day (the business day hasn't started yet).
 * If after the cutoff, it's the current calendar day.
 *
 * Example: cutoff = 6 (6 AM)
 *   - 2024-04-08 03:00 → operational date = 2024-04-07
 *   - 2024-04-08 08:00 → operational date = 2024-04-08
 */
export function getOperationalDate(
  cutoffHour: number,
  timezone: string,
  now: Date = new Date(),
): Date {
  // Format current time in the business timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')!.value);
  const month = Number(parts.find((p) => p.type === 'month')!.value);
  const day = Number(parts.find((p) => p.type === 'day')!.value);
  const hour = Number(parts.find((p) => p.type === 'hour')!.value);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (hour < cutoffHour) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  return date;
}

/**
 * Parses a date string (YYYY-MM-DD) into a UTC Date at midnight.
 */
export function parseOperationalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Converts an operational date into UTC start/end boundaries.
 *
 * The operational day runs from `cutoffHour` on the operational date
 * to `cutoffHour` on the next calendar day, both in the business timezone.
 *
 * Example: operationalDate = 2026-04-14, cutoff = 6, tz = America/Mexico_City (UTC-6)
 *   start = 2026-04-14 06:00 CST = 2026-04-14 12:00 UTC
 *   end   = 2026-04-15 06:00 CST = 2026-04-15 12:00 UTC
 */
export function getOperationalDateRange(
  operationalDate: Date,
  cutoffHour: number,
  timezone: string,
): { start: Date; end: Date } {
  const year = operationalDate.getUTCFullYear();
  const month = operationalDate.getUTCMonth();
  const day = operationalDate.getUTCDate();

  const start = localToUTC(year, month, day, cutoffHour, timezone);
  const end = localToUTC(year, month, day + 1, cutoffHour, timezone);

  return { start, end };
}

/**
 * Converts a local date/time in a given timezone to a UTC Date.
 * Uses Intl.DateTimeFormat to determine the UTC offset for that moment.
 */
function localToUTC(
  year: number,
  month: number,
  day: number,
  hour: number,
  timezone: string,
): Date {
  // Create a rough UTC estimate of the target local time
  const estimate = new Date(Date.UTC(year, month, day, hour, 0, 0, 0));

  // Get what the local time would be at that UTC instant
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(estimate);
  const localYear = Number(parts.find((p) => p.type === 'year')!.value);
  const localMonth = Number(parts.find((p) => p.type === 'month')!.value);
  const localDay = Number(parts.find((p) => p.type === 'day')!.value);
  const localHour = Number(parts.find((p) => p.type === 'hour')!.value);
  const localMinute = Number(parts.find((p) => p.type === 'minute')!.value);

  // offset = local - UTC (in ms)
  const localMs = new Date(Date.UTC(localYear, localMonth - 1, localDay, localHour, localMinute)).getTime();
  const offsetMs = localMs - estimate.getTime();

  // target UTC = desired local - offset
  const targetLocal = new Date(Date.UTC(year, month, day, hour, 0, 0, 0));
  return new Date(targetLocal.getTime() - offsetMs);
}
