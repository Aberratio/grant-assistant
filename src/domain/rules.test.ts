import { describe, expect, it } from 'vitest';
import { LANGS } from '../i18n/lang';
import { messages } from '../i18n/messages';
import { assess, evaluateCall, rank } from './rules';
import type { CallMatch, CompanyProfile, ConditionResult } from './types';

/** A fictional manufacturing SME that meets every Dig.IT 2/2026 condition. */
const base: CompanyProfile = {
  name: 'Sample Manufacturing Ltd (fictional)',
  industry: 'manufacturing',
  size: 'small',
  voivodeship: 'wielkopolskie',
  closedFiscalYears: 8,
  netResultPln: 250_000,
  deMinimisAvailable: 'yes',
  need: 'digital',
  description: 'Rollout of an MES and visual quality inspection.',
};

const company = (patch: Partial<CompanyProfile>): CompanyProfile => ({ ...base, ...patch });

function condition(match: CallMatch, id: string): ConditionResult {
  const found = match.conditions.find((c) => c.id === id);
  if (!found) throw new Error(`condition ${id} missing in ${match.callId}`);
  return found;
}

describe('Dig.IT 2/2026 eligibility', () => {
  const digit = (patch: Partial<CompanyProfile> = {}) =>
    evaluateCall(company(patch), 'digit-2-2026', 'en');

  it('accepts a manufacturing SME meeting every condition', () => {
    const match = digit();
    expect(match.status).toBe('eligible');
    expect(match.conditions.map((c) => c.status)).toEqual(Array(6).fill('met'));
  });

  describe('closed fiscal years (≥ 5)', () => {
    it.each([
      [0, 'unmet'],
      [4, 'unmet'],
      [5, 'met'],
      [6, 'met'],
    ] as const)('%i closed years → %s', (years, status) => {
      const match = digit({ closedFiscalYears: years });
      expect(condition(match, 'years').status).toBe(status);
      expect(match.status).toBe(status === 'met' ? 'eligible' : 'ineligible');
    });

    it('names how many years are missing, in both languages', () => {
      expect(condition(digit({ closedFiscalYears: 3 }), 'years').detail).toContain('2 short');
      const pl = evaluateCall(company({ closedFiscalYears: 3 }), 'digit-2-2026', 'pl');
      expect(condition(pl, 'years').detail).toBe(messages('pl').rules.digit.yearsUnmet(3, 2));
    });
  });

  describe('positive net result', () => {
    it.each([
      [-1, 'unmet', 'ineligible'],
      [0, 'unmet', 'ineligible'],
      [1, 'met', 'eligible'],
      [null, 'uncertain', 'conditional'],
    ] as const)('net result %s → %s', (net, status, overall) => {
      const match = digit({ netResultPln: net });
      expect(condition(match, 'net-result').status).toBe(status);
      expect(match.status).toBe(overall);
    });
  });

  describe('manufacturing sector', () => {
    it.each([
      ['manufacturing', 'met'],
      ['manufacturing_services', 'met'],
      ['it', 'unmet'],
      ['retail', 'unmet'],
      ['services', 'unmet'],
    ] as const)('%s → %s', (industry, status) => {
      expect(condition(digit({ industry }), 'sector').status).toBe(status);
    });
  });

  describe('SME status', () => {
    it.each([
      ['micro', 'met'],
      ['small', 'met'],
      ['medium', 'met'],
      ['large', 'unmet'],
    ] as const)('%s → %s', (size, status) => {
      expect(condition(digit({ size }), 'sme').status).toBe(status);
    });
  });

  describe('de minimis limit', () => {
    it.each([
      ['yes', 'met', 'eligible'],
      ['no', 'unmet', 'ineligible'],
      ['unknown', 'uncertain', 'conditional'],
    ] as const)('%s → %s', (deMinimisAvailable, status, overall) => {
      const match = digit({ deMinimisAvailable });
      expect(condition(match, 'de-minimis').status).toBe(status);
      expect(match.status).toBe(overall);
    });
  });

  describe('project scope', () => {
    it.each([
      ['digital', 'met'],
      ['training', 'uncertain'],
      ['rnd', 'uncertain'],
    ] as const)('need %s → %s', (need, status) => {
      expect(condition(digit({ need }), 'scope').status).toBe(status);
    });
  });

  it('lists every failed condition, not only the first', () => {
    const match = digit({ closedFiscalYears: 2, netResultPln: -5_000, size: 'large' });
    const unmet = match.conditions.filter((c) => c.status === 'unmet').map((c) => c.id);
    expect(unmet).toEqual(['sme', 'years', 'net-result']);
  });
});

describe('Innowacje dla STEP eligibility', () => {
  const step = (patch: Partial<CompanyProfile>) =>
    evaluateCall(company(patch), 'innowacje-dla-step', 'en');

  it('accepts a Lower Silesian SME with an R&D need, regardless of sector or age', () => {
    const match = step({
      voivodeship: 'dolnoslaskie',
      need: 'rnd',
      industry: 'it',
      closedFiscalYears: 1,
      netResultPln: -40_000,
    });
    expect(match.status).toBe('eligible');
  });

  it('rejects a company outside Lower Silesia', () => {
    const match = step({ voivodeship: 'opolskie', need: 'rnd' });
    expect(condition(match, 'region').status).toBe('unmet');
    expect(match.status).toBe('ineligible');
  });

  it('rejects a large enterprise', () => {
    expect(step({ voivodeship: 'dolnoslaskie', need: 'rnd', size: 'large' }).status).toBe(
      'ineligible',
    );
  });

  it('rejects a need that is not an R&D service', () => {
    const match = step({ voivodeship: 'dolnoslaskie', need: 'digital' });
    expect(condition(match, 'scope').status).toBe('unmet');
  });
});

describe('SMART path (sciezka-smart-msp) eligibility', () => {
  const smart = (patch: Partial<CompanyProfile>) =>
    evaluateCall(company(patch), 'sciezka-smart-msp', 'en');

  it('accepts an SME from any region with an R&D need', () => {
    expect(smart({ voivodeship: 'podlaskie', need: 'rnd' }).status).toBe('eligible');
  });

  it('requires R&D work', () => {
    const match = smart({ need: 'training' });
    expect(condition(match, 'scope').status).toBe('unmet');
    expect(match.status).toBe('ineligible');
  });

  it('rejects a large enterprise', () => {
    expect(smart({ need: 'rnd', size: 'large' }).status).toBe('ineligible');
  });
});

describe('Development services 7.4A FEDS eligibility', () => {
  const feds = (patch: Partial<CompanyProfile>) =>
    evaluateCall(company(patch), 'uslugi-rozwojowe-7-4a', 'en');

  it('accepts a Lower Silesian SME that wants training', () => {
    expect(feds({ voivodeship: 'dolnoslaskie', need: 'training' }).status).toBe('eligible');
  });

  it('rejects a large enterprise', () => {
    expect(feds({ voivodeship: 'dolnoslaskie', need: 'training', size: 'large' }).status).toBe(
      'ineligible',
    );
  });

  it('rejects a company outside Lower Silesia', () => {
    expect(feds({ voivodeship: 'slaskie', need: 'training' }).status).toBe('ineligible');
  });

  it('rejects a need other than a development service', () => {
    expect(feds({ voivodeship: 'dolnoslaskie', need: 'rnd' }).status).toBe('ineligible');
  });
});

describe('evaluateCall', () => {
  it('throws on an unknown call id', () => {
    expect(() => evaluateCall(base, 'nope', 'en')).toThrow('Unknown funding call');
  });

  it('gives every condition a non-empty explanation', () => {
    for (const lang of LANGS) {
      for (const match of assess(company({ netResultPln: null }), lang).ranked) {
        for (const c of match.conditions) expect(c.detail.length).toBeGreaterThan(10);
      }
    }
  });
});

describe('rank', () => {
  const met = (id: string): ConditionResult => ({ id, label: id, status: 'met', detail: '' });
  const unsure = (id: string): ConditionResult => ({
    id,
    label: id,
    status: 'uncertain',
    detail: '',
  });
  const m = (callId: string, status: CallMatch['status'], conditions: ConditionResult[]) => ({
    callId,
    status,
    conditions,
  });

  it('orders eligible before conditional before ineligible', () => {
    const ranked = rank([
      m('sciezka-smart-msp', 'ineligible', []),
      m('innowacje-dla-step', 'conditional', [unsure('a')]),
      m('uslugi-rozwojowe-7-4a', 'eligible', [met('a')]),
    ]);
    expect(ranked.map((r) => r.status)).toEqual(['eligible', 'conditional', 'ineligible']);
  });

  it('prefers fewer open questions within the same status', () => {
    const ranked = rank([
      m('digit-2-2026', 'conditional', [unsure('a'), unsure('b')]),
      m('sciezka-smart-msp', 'conditional', [unsure('a')]),
    ]);
    expect(ranked.map((r) => r.callId)).toEqual(['sciezka-smart-msp', 'digit-2-2026']);
  });

  it('breaks a full tie by the curated call order', () => {
    const ranked = rank([
      m('sciezka-smart-msp', 'eligible', [met('a')]),
      m('innowacje-dla-step', 'eligible', [met('a')]),
    ]);
    expect(ranked.map((r) => r.callId)).toEqual(['innowacje-dla-step', 'sciezka-smart-msp']);
  });

  it('does not mutate its input', () => {
    const input = [m('sciezka-smart-msp', 'ineligible', []), m('digit-2-2026', 'eligible', [])];
    const copy = structuredClone(input);
    rank(input);
    expect(input).toEqual(copy);
  });
});

describe('assess', () => {
  it('picks Dig.IT for a mature, profitable manufacturer that wants digitalisation', () => {
    expect(assess(base, 'en').best?.callId).toBe('digit-2-2026');
  });

  it('picks the STEP voucher over SMART for a Lower Silesian R&D project', () => {
    const result = assess(company({ voivodeship: 'dolnoslaskie', need: 'rnd' }), 'en');
    expect(result.best?.callId).toBe('innowacje-dla-step');
    expect(result.ranked[1]?.callId).toBe('sciezka-smart-msp');
  });

  it('picks the 7.4A training subsidy for a Lower Silesian SME that wants training', () => {
    const result = assess(company({ voivodeship: 'dolnoslaskie', need: 'training' }), 'en');
    expect(result.best?.callId).toBe('uslugi-rozwojowe-7-4a');
    // Dig.IT would still be possible (training as an additional cost), so it ranks next.
    expect(result.ranked[1]?.callId).toBe('digit-2-2026');
    expect(result.ranked[1]?.status).toBe('conditional');
  });

  it('returns no best match when every call is ineligible', () => {
    const result = assess(company({ size: 'large' }), 'en');
    expect(result.best).toBeNull();
    expect(result.ranked).toHaveLength(4);
  });

  it('is deterministic for the same input', () => {
    expect(assess(base, 'en')).toEqual(assess(structuredClone(base), 'en'));
  });
});

describe('language', () => {
  it('decides the same statuses in every language; only the wording differs', () => {
    const variants: Partial<CompanyProfile>[] = [
      {},
      { netResultPln: null },
      { size: 'large' },
      { voivodeship: 'dolnoslaskie', need: 'rnd' },
      { closedFiscalYears: 2, deMinimisAvailable: 'unknown' },
    ];
    for (const patch of variants) {
      const [en, pl] = LANGS.map((lang) => assess(company(patch), lang));
      const decision = (r: typeof en) =>
        r!.ranked.map((m) => [m.callId, m.status, m.conditions.map((c) => [c.id, c.status])]);
      expect(decision(pl), JSON.stringify(patch)).toEqual(decision(en));
      expect(pl!.ranked[0]!.conditions[0]!.label).not.toBe(en!.ranked[0]!.conditions[0]!.label);
    }
  });

  it('explains the years condition with the Polish plural form', () => {
    const t = messages('pl').rules.digit;
    const detail = (years: number) =>
      condition(evaluateCall(company({ closedFiscalYears: years }), 'digit-2-2026', 'pl'), 'years')
        .detail;
    expect(detail(3)).toBe(t.yearsUnmet(3, 2));
    expect(detail(22)).toBe(t.yearsMet(22));
    expect(t.yearsMet(22)).not.toBe(t.yearsMet(12).replace('12', '22'));
  });
});
