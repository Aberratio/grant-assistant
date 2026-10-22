/** Interface languages. Every user-facing text exists in both. */
export const LANGS = ['en', 'pl'] as const;
export type Lang = (typeof LANGS)[number];

export const FALLBACK_LANG: Lang = 'en';

export function isLang(value: unknown): value is Lang {
  return (LANGS as readonly unknown[]).includes(value);
}

/** `?lang=pl` / `?lang=en` (case-insensitive); anything else is ignored. */
export function langFromSearch(search: string): Lang | null {
  const value = new URLSearchParams(search).get('lang')?.trim().toLowerCase();
  return isLang(value) ? value : null;
}

/** First browser language we support, by primary subtag (`pl-PL` → `pl`). */
export function langFromBrowser(languages: readonly string[]): Lang | null {
  for (const tag of languages) {
    const primary = tag.split('-')[0]?.toLowerCase();
    if (isLang(primary)) return primary;
  }
  return null;
}

/** URL parameter first (used by embeds), then the browser language, then English. */
export function detectLang(search: string, languages: readonly string[]): Lang {
  return langFromSearch(search) ?? langFromBrowser(languages) ?? FALLBACK_LANG;
}

/** The same query string with `lang` set; other parameters (e.g. `embed`) are kept. */
export function searchWithLang(search: string, lang: Lang): string {
  const params = new URLSearchParams(search);
  params.set('lang', lang);
  return `?${params.toString()}`;
}
