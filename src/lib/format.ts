import { brand } from '@/config/brand';

const DATE_FORMAT = new Intl.DateTimeFormat(brand.locale, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat(brand.locale, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return DATE_FORMAT.format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return DATE_TIME_FORMAT.format(date);
}

/** "in 3 days" / "2 hours ago" / "today". */
export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / 86_400_000);

  if (Math.abs(diffMs) < 60_000) return 'just now';

  const rtf = new Intl.RelativeTimeFormat(brand.locale, { numeric: 'auto' });

  if (Math.abs(diffDays) >= 1) return rtf.format(diffDays, 'day');
  const diffHours = Math.round(diffMs / 3_600_000);
  if (Math.abs(diffHours) >= 1) return rtf.format(diffHours, 'hour');
  return rtf.format(Math.round(diffMs / 60_000), 'minute');
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = brand.defaultCurrency,
): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(brand.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

/**
 * Allowances are stored as whole minutes so figures like "1 hour 20 minutes"
 * are exact. This renders them the way the spec describes them.
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(minutes));

  if (abs === 0) return '0 minutes';

  const hours = Math.floor(abs / 60);
  const mins = abs % 60;

  const parts: string[] = [];
  if (hours) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (mins) parts.push(`${mins} minute${mins === 1 ? '' : 's'}`);

  return sign + parts.join(' ');
}

/** Compact form for meters and tight table cells: "2h 20m". */
export function formatDurationShort(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  const abs = Math.abs(Math.round(minutes));
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  const sign = minutes < 0 ? '-' : '';
  if (!hours) return `${sign}${mins}m`;
  if (!mins) return `${sign}${hours}h`;
  return `${sign}${hours}h ${mins}m`;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 && unit > 0 ? 1 : 0)} ${units[unit]}`;
}

/** Whole days until a date; negative when overdue. */
export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);

  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function isOverdue(dueDate: string | null | undefined, isComplete = false): boolean {
  if (isComplete || !dueDate) return false;
  const days = daysUntil(dueDate);
  return days !== null && days < 0;
}
