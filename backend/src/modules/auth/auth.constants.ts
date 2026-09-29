export const ACCESS_COOKIE = 'segue_at';
export const REFRESH_COOKIE = 'segue_rt';

/** Parse a TTL like `15m`, `7d`, `3600s` into milliseconds. */
export function ttlToMs(ttl: string): number {
  const match = /^(\d+)\s*([smhd])?$/.exec(ttl.trim());
  if (!match) return 15 * 60 * 1000;
  const n = Number(match[1]);
  const unit = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[match[2] ?? 's']!;
  return n * unit;
}
