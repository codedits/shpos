/**
 * Pakistan Standard Time (PKT - Asia/Karachi, UTC+5) Date & Time Utilities
 * Guarantees that business day boundaries, registers, and metrics calculate
 * according to Pakistan time instead of UTC midnight.
 */

export const BUSINESS_TIMEZONE = 'Asia/Karachi';

/**
 * Returns the current date/time ISO string formatted in Asia/Karachi.
 */
export function getNowPKT(): string {
  return new Date().toISOString();
}

/**
 * Formats an ISO date string for display in Pakistan locale.
 */
export function formatDatePKT(
  dateInput: string | Date | null | undefined,
  includeTime = false
): string {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }
      : {}),
  }).format(d);
}

/**
 * Returns the start and end Date objects for "Today" in Asia/Karachi timezone.
 */
export function getPKTTodayRange(): { start: Date; end: Date; startISO: string; endISO: string } {
  const now = new Date();
  
  // Format current date in Asia/Karachi (YYYY-MM-DD)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = formatter.format(now); // e.g. "2026-08-16"

  // In PKT (UTC+5), midnight is (Day 00:00:00 PKT) -> (Previous Day 19:00:00 UTC)
  const start = new Date(`${todayStr}T00:00:00.000+05:00`);
  const end = new Date(`${todayStr}T23:59:59.999+05:00`);

  return {
    start,
    end,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
}

/**
 * Determines whether a given ISO date string falls on "Today" in Asia/Karachi.
 */
export function isTodayPKT(dateInput: string | Date): boolean {
  if (!dateInput) return false;
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return false;

  const { start, end } = getPKTTodayRange();
  return d >= start && d <= end;
}
