import { BUSINESS_TIME_ZONE } from '../constants/loanConfig.js';

/** A calendar date with no time or zone component. */
export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const businessDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The calendar date of `instant` as observed in the business time zone. */
export function businessDateOf(instant: Date): CalendarDate {
  const [year, month, day] = businessDateFormatter.format(instant).split('-').map(Number);
  return { year, month, day };
}

/**
 * Parses user-entered dates. A plain `YYYY-MM-DD` string is taken as a calendar date
 * (no time-zone shift, and impossible dates such as 2023-02-30 are rejected). Any other
 * parseable value is treated as an instant and converted to its business-zone date.
 */
export function parseCalendarDate(input: string | Date): CalendarDate | null {
  if (typeof input === 'string') {
    const match = ISO_DATE.exec(input.trim());
    if (match) {
      const [year, month, day] = match.slice(1).map(Number);
      const probe = new Date(Date.UTC(year, month - 1, day));
      const valid =
        probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
      return valid ? { year, month, day } : null;
    }
  }
  const instant = input instanceof Date ? input : new Date(input);
  return Number.isNaN(instant.getTime()) ? null : businessDateOf(instant);
}

/** Negative if a < b, zero if equal, positive if a > b. */
export function compareCalendarDates(a: CalendarDate, b: CalendarDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/** Completed years between `dob` and `today` (birthday not yet reached ⇒ one less). */
export function completedYears(dob: CalendarDate, today: CalendarDate): number {
  let age = today.year - dob.year;
  if (today.month < dob.month || (today.month === dob.month && today.day < dob.day)) {
    age--;
  }
  return age;
}

/** UTC-midnight Date for a calendar date — the canonical stored form for date-only fields. */
export function calendarDateToUtc({ year, month, day }: CalendarDate): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * The instant at which the current business-zone day began, for "…today" counters.
 * BUSINESS_TIME_ZONE (Asia/Kolkata) is a fixed UTC+05:30 with no DST.
 */
export function startOfBusinessDay(now: Date = new Date()): Date {
  const { year, month, day } = businessDateOf(now);
  const IST_OFFSET_MS = 330 * 60 * 1000;
  return new Date(Date.UTC(year, month - 1, day) - IST_OFFSET_MS);
}
