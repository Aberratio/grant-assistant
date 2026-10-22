import { describe, expect, it } from 'vitest';
import { listCalls } from '../data/calls';
import { VOIVODESHIP_LABEL } from '../data/regions';
import { FIXTURES } from '../fixtures/companies';
import { formatDate, pluralPl } from './format';
import { detectLang, LANGS, langFromBrowser, langFromSearch, searchWithLang } from './lang';
import { MESSAGES } from './messages';

type Tree = { [key: string]: unknown };

/** Every leaf path with its kind: "app.heading:string", "app.disclaimer:function/1". */
function shape(value: unknown, prefix = ''): string[] {
  if (typeof value === 'function') return [`${prefix}:function/${value.length}`];
  if (typeof value === 'string') return [`${prefix}:string`];
  if (value && typeof value === 'object') {
    return Object.keys(value as Tree)
      .sort()
      .flatMap((k) => shape((value as Tree)[k], prefix ? `${prefix}.${k}` : k));
  }
  return [`${prefix}:${typeof value}`];
}

function leaves(value: unknown): unknown[] {
  if (value && typeof value === 'object') return Object.values(value as Tree).flatMap(leaves);
  return [value];
}

describe('interface dictionaries', () => {
  it('have exactly the same keys, and functions take the same arguments', () => {
    expect(shape(MESSAGES.pl)).toEqual(shape(MESSAGES.en));
  });

  it.each(LANGS)('%s has no empty strings', (lang) => {
    for (const leaf of leaves(MESSAGES[lang])) {
      if (typeof leaf === 'string') expect(leaf.trim()).not.toBe('');
    }
  });

  it('the English dictionary contains no Polish letters', () => {
    const strings = leaves(MESSAGES.en).filter((l): l is string => typeof l === 'string');
    const withArgs = [
      MESSAGES.en.app.disclaimer('X'),
      MESSAGES.en.rules.digit.yearsUnmet(3, 2),
      MESSAGES.en.template.summary('A', 'b', 'C'),
    ];
    for (const s of [...strings, ...withArgs])
      expect(s).not.toMatch(/[\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017a\u017c]/i);
  });

  it('the two languages actually differ', () => {
    expect(MESSAGES.pl.app.heading).not.toBe(MESSAGES.en.app.heading);
    expect(MESSAGES.pl.app.disclaimerTitle).not.toBe(MESSAGES.en.app.disclaimerTitle);
  });
});

describe('bilingual data', () => {
  it('every funding call has the same structure in both languages', () => {
    const [en, pl] = LANGS.map((lang) => listCalls(lang));
    expect(pl!.map((c) => c.id)).toEqual(en!.map((c) => c.id));
    pl!.forEach((call, i) => {
      const other = en![i]!;
      expect(call.notes.length, call.id).toBe(other.notes.length);
      expect(call.documents.length, call.id).toBe(other.documents.length);
      expect(call.sources.map((s) => s.url)).toEqual(other.sources.map((s) => s.url));
      expect(call.needs).toEqual(other.needs);
    });
  });

  it('every sample company has the same facts in both languages', () => {
    for (const f of FIXTURES) {
      const facts = (c: typeof f.company.en) => ({ ...c, name: null, description: null });
      expect(facts(f.company.pl), f.id).toEqual(facts(f.company.en));
      expect(f.company.pl.description).not.toBe(f.company.en.description);
    }
  });

  it('every region has a label in both languages', () => {
    expect(Object.keys(VOIVODESHIP_LABEL.pl).sort()).toEqual(
      Object.keys(VOIVODESHIP_LABEL.en).sort(),
    );
  });
});

describe('language detection', () => {
  it.each([
    ['?lang=pl', ['en-US'], 'pl'],
    ['?lang=EN', ['pl-PL'], 'en'],
    ['?embed=1&lang=pl', [], 'pl'],
    ['?lang=de', ['pl-PL', 'en'], 'pl'],
    ['', ['de-DE', 'en-GB'], 'en'],
    ['', ['pl'], 'pl'],
    ['', ['de-DE', 'fr'], 'en'],
    ['', [], 'en'],
  ] as const)('%j with browser %j → %s', (search, languages, expected) => {
    expect(detectLang(search, languages)).toBe(expected);
  });

  it('ignores unsupported values', () => {
    expect(langFromSearch('?lang=')).toBeNull();
    expect(langFromBrowser(['de'])).toBeNull();
  });

  it('sets lang in the query string and keeps the other parameters', () => {
    expect(searchWithLang('?embed=1', 'pl')).toBe('?embed=1&lang=pl');
    expect(searchWithLang('?lang=pl&embed=1', 'en')).toBe('?lang=en&embed=1');
    expect(searchWithLang('', 'en')).toBe('?lang=en');
  });
});

describe('formatting', () => {
  it('formats dates per language without Intl', () => {
    expect(formatDate('2026-10-21', 'pl')).toBe('21.10.2026');
    expect(formatDate('2026-10-21', 'en')).toBe('21 October 2026');
    expect(formatDate('2026-11-02', 'en')).toBe('2 November 2026');
  });

  it.each([
    [1, 'one'],
    [2, 'few'],
    [4, 'few'],
    [5, 'many'],
    [12, 'many'],
    [14, 'many'],
    [22, 'few'],
    [25, 'many'],
    [0, 'many'],
  ] as const)('Polish plural of %i is the %s form', (n, form) => {
    expect(pluralPl(n, ['one', 'few', 'many'])).toBe(form);
  });
});
