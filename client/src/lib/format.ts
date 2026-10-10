const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** ₹1,50,000.00 — always two decimals for money that may carry paise. */
export function formatCurrency(amount: number | null | undefined): string {
  return currency.format(amount ?? 0);
}

/** ₹1,50,000 — for whole-rupee figures such as slider bounds and principal. */
export function formatRupees(amount: number | null | undefined): string {
  return wholeCurrency.format(amount ?? 0);
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});

/** 10 Oct 2026 (IST). */
export function formatDate(value?: string | Date | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

/** 10 Oct 2026, 04:05 pm (IST). */
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

/** Date-only fields (DOB, payment date) are stored as UTC midnight; show them without shifting. */
export function formatCalendarDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export function formatFileSize(bytes = 0): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Masks a PAN for list views: ABCDE1234F → ABXXXXX34F. */
export function maskPan(pan?: string): string {
  if (!pan || pan.length !== 10) return pan ?? '—';
  return `${pan.slice(0, 2)}XXXXX${pan.slice(7)}`;
}

export function shortId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}
