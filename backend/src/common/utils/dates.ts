/** Date helpers. Calendar dates are exchanged as ISO `YYYY-MM-DD` strings. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  for (let cur = start; cur <= end; cur = addDays(cur, 1)) days.push(cur);
  return days;
}

export const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export function weekdayOf(iso: string): Weekday {
  return WEEKDAYS[parseISODate(iso).getDay()];
}

export function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${pad(month)}-01`;
  const end = toISODate(new Date(year, month, 0));
  return { start, end };
}

/** Combine an ISO date and `HH:mm` time into a local Date. */
export function atTime(iso: string, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = parseISODate(iso);
  d.setHours(h, m, 0, 0);
  return d;
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
}
