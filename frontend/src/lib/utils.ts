import { clsx, type ClassValue } from 'clsx';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const toDate = (value: string | Date) => (typeof value === 'string' ? (value.length === 10 ? parseISO(value) : new Date(value)) : value);

export function formatDate(value?: string | Date | null, pattern = 'MMM d, yyyy') {
  if (!value) return '—';
  return format(toDate(value), pattern);
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return '—';
  return format(toDate(value), 'MMM d, yyyy · h:mm a');
}

export function formatTime(value?: string | Date | null) {
  if (!value) return '—';
  return format(toDate(value), 'h:mm a');
}

export function timeAgo(value?: string | Date | null) {
  if (!value) return '—';
  return formatDistanceToNow(toDate(value), { addSuffix: true });
}

export function formatMoney(amount?: number | null, currency = 'USD', compact = false) {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 2,
  }).format(amount);
}

export function formatNumber(n?: number | null) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-US').format(n);
}

const ACRONYMS = new Set(['HR', 'IT', 'QA', 'UX', 'CTC', 'SLA', 'LOP', 'ENPS', 'ID', 'CEO', 'CTO', 'VP']);

/** `NOTICE_PERIOD` → `Notice period`, `HR_ADMIN` → `HR admin` */
export function humanize(value?: string | null) {
  if (!value) return '—';
  return value
    .split('_')
    .map((w, i) => (ACRONYMS.has(w.toUpperCase()) ? w.toUpperCase() : i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
    .join(' ');
}

export function initials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function minutesToHours(minutes?: number | null) {
  if (!minutes) return '0h';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function todayISO() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong';
}
