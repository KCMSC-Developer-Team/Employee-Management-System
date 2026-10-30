export const DHAKA = 'Asia/Dhaka';

export function appUrl(): string {
  const explicit = process.env.APP_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d.length === 10 ? d + 'T00:00:00' : d) : d;
  if (isNaN(date.getTime())) return String(d);
  return new Intl.DateTimeFormat('en-GB', { timeZone: DHAKA, day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return String(d);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/** Current day-of-week (0 = Sunday), minutes since midnight and date in Bangladesh time. */
export function dhakaNow(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = parseInt(get('hour'), 10) % 24;
  return {
    day: map[get('weekday')] ?? 0,
    minutes: hour * 60 + parseInt(get('minute'), 10),
    date: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
