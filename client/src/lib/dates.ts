import { BUSINESS_TIME_ZONE } from './loanConfig';

/** Today's date in the business time zone as YYYY-MM-DD (used for date-input defaults and limits). */
export function businessToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Converts a stored date (ISO string) to YYYY-MM-DD for a date input, without zone shift. */
export function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return match ? match[1] : '';
}
