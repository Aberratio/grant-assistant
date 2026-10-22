import type { Lang } from './lang';

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * ISO date → `21.10.2026` (pl) or `21 October 2026` (en). Hand-written instead of
 * Intl so the output is identical in every runtime (tests, recordings, browsers).
 */
export function formatDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-');
  if (lang === 'pl') return `${d}.${m}.${y}`;
  return `${Number(d)} ${MONTHS_EN[Number(m) - 1] ?? m} ${y}`;
}

/** English plural: 1 year, 2 years. */
export function pluralEn(n: number, one: string, many: string): string {
  return Math.abs(n) === 1 ? one : many;
}

/**
 * Polish plural: 1 rok, 2–4 lata (except 12–14), 5+ lat. `forms` = [one, few, many].
 */
export function pluralPl(n: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(n);
  if (abs === 1) return forms[0];
  const lastDigit = abs % 10;
  const lastTwo = abs % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return forms[1];
  return forms[2];
}
