import type { CallMatch, CompanyProfile } from './types';

/** JSON with object keys sorted at every depth, so equal values serialise equally. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** 32-bit FNV-1a over the UTF-8 bytes of the input, as 8 hex digits. Sync and browser-safe. */
export function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(input)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Identity of one assistant run: the company as entered plus the rule result
 * the model saw. A recording is replayed only when this hash matches, so a rule
 * or data change can never silently replay an outdated draft.
 */
export function hashAssessmentInput(company: CompanyProfile, best: CallMatch | null): string {
  return fnv1a(canonicalJson({ company, best }));
}
