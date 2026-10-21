import { describe, expect, it } from 'vitest';
import { assess, evaluateCall, rank } from './rules';
import type { CallMatch, CompanyProfile, ConditionResult } from './types';

/** A fictional manufacturing SME that meets every Dig.IT 2/2026 condition. */
const base: CompanyProfile = {
  name: 'Przykładowa Sp. z o.o.',
  industry: 'produkcja',
  size: 'mala',
  voivodeship: 'wielkopolskie',
  closedFiscalYears: 8,
  netResultPln: 250_000,
  deMinimisAvailable: 'tak',
  need: 'cyfryzacja',
  description: 'Wdrożenie systemu MES i wizyjnej kontroli jakości.',
};

const company = (patch: Partial<CompanyProfile>): CompanyProfile => ({ ...base, ...patch });

function condition(match: CallMatch, id: string): ConditionResult {
  const found = match.conditions.find((c) => c.id === id);
  if (!found) throw new Error(`condition ${id} missing in ${match.callId}`);
  return found;
}

describe('Dig.IT 2/2026 eligibility', () => {
  const digit = (patch: Partial<CompanyProfile> = {}) =>
    evaluateCall(company(patch), 'digit-2-2026');

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
      expect(condition(match, 'lata').status).toBe(status);
      expect(match.status).toBe(status === 'met' ? 'eligible' : 'ineligible');
    });

    it('names how many years are missing', () => {
      expect(condition(digit({ closedFiscalYears: 3 }), 'lata').detail).toContain('brakuje 2');
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
      expect(condition(match, 'wynik').status).toBe(status);
      expect(match.status).toBe(overall);
    });
  });

  describe('manufacturing sector', () => {
    it.each([
      ['produkcja', 'met'],
      ['uslugi_produkcyjne', 'met'],
      ['it', 'unmet'],
      ['handel', 'unmet'],
      ['uslugi', 'unmet'],
    ] as const)('%s → %s', (industry, status) => {
      expect(condition(digit({ industry }), 'branza').status).toBe(status);
    });
  });

  describe('SME status', () => {
    it.each([
      ['mikro', 'met'],
      ['mala', 'met'],
      ['srednia', 'met'],
      ['duza', 'unmet'],
    ] as const)('%s → %s', (size, status) => {
      expect(condition(digit({ size }), 'msp').status).toBe(status);
    });
  });

  describe('de minimis limit', () => {
    it.each([
      ['tak', 'met', 'eligible'],
      ['nie', 'unmet', 'ineligible'],
      ['nie_wiem', 'uncertain', 'conditional'],
    ] as const)('%s → %s', (deMinimisAvailable, status, overall) => {
      const match = digit({ deMinimisAvailable });
      expect(condition(match, 'de-minimis').status).toBe(status);
      expect(match.status).toBe(overall);
    });
  });

  describe('project scope', () => {
    it.each([
      ['cyfryzacja', 'met'],
      ['szkolenia', 'uncertain'],
      ['br', 'uncertain'],
    ] as const)('need %s → %s', (need, status) => {
      expect(condition(digit({ need }), 'zakres').status).toBe(status);
    });
  });

  it('lists every failed condition, not only the first', () => {
    const match = digit({ closedFiscalYears: 2, netResultPln: -5_000, size: 'duza' });
    const unmet = match.conditions.filter((c) => c.status === 'unmet').map((c) => c.id);
    expect(unmet).toEqual(['msp', 'lata', 'wynik']);
  });
});

describe('Innowacje dla STEP eligibility', () => {
  const step = (patch: Partial<CompanyProfile>) =>
    evaluateCall(company(patch), 'innowacje-dla-step');

  it('accepts a Lower Silesian SME with an R&D need, regardless of sector or age', () => {
    const match = step({
      voivodeship: 'dolnoslaskie',
      need: 'br',
      industry: 'it',
      closedFiscalYears: 1,
      netResultPln: -40_000,
    });
    expect(match.status).toBe('eligible');
  });

  it('rejects a company outside Lower Silesia', () => {
    const match = step({ voivodeship: 'opolskie', need: 'br' });
    expect(condition(match, 'region').status).toBe('unmet');
    expect(match.status).toBe('ineligible');
  });

  it('rejects a large enterprise', () => {
    expect(step({ voivodeship: 'dolnoslaskie', need: 'br', size: 'duza' }).status).toBe(
      'ineligible',
    );
  });

  it('rejects a need that is not an R&D service', () => {
    const match = step({ voivodeship: 'dolnoslaskie', need: 'cyfryzacja' });
    expect(condition(match, 'zakres').status).toBe('unmet');
  });
});

describe('Ścieżka SMART MŚP eligibility', () => {
  const smart = (patch: Partial<CompanyProfile>) =>
    evaluateCall(company(patch), 'sciezka-smart-msp');

  it('accepts an SME from any region with an R&D need', () => {
    expect(smart({ voivodeship: 'podlaskie', need: 'br' }).status).toBe('eligible');
  });

  it('requires R&D work', () => {
    const match = smart({ need: 'szkolenia' });
    expect(condition(match, 'zakres').status).toBe('unmet');
    expect(match.status).toBe('ineligible');
  });

  it('rejects a large enterprise', () => {
    expect(smart({ need: 'br', size: 'duza' }).status).toBe('ineligible');
  });
});

describe('Usługi rozwojowe 7.4A FEDS eligibility', () => {
  const feds = (patch: Partial<CompanyProfile>) =>
    evaluateCall(company(patch), 'uslugi-rozwojowe-7-4a');

  it('accepts a Lower Silesian SME that wants training', () => {
    expect(feds({ voivodeship: 'dolnoslaskie', need: 'szkolenia' }).status).toBe('eligible');
  });

  it('rejects a company outside Lower Silesia', () => {
    expect(feds({ voivodeship: 'slaskie', need: 'szkolenia' }).status).toBe('ineligible');
  });

  it('rejects a need other than a development service', () => {
    expect(feds({ voivodeship: 'dolnoslaskie', need: 'br' }).status).toBe('ineligible');
  });
});

describe('evaluateCall', () => {
  it('throws on an unknown call id', () => {
    expect(() => evaluateCall(base, 'nope')).toThrow('Unknown funding call');
  });

  it('gives every condition a non-empty explanation', () => {
    for (const match of assess(company({ netResultPln: null })).ranked) {
      for (const c of match.conditions) expect(c.detail.length).toBeGreaterThan(10);
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
    expect(assess(base).best?.callId).toBe('digit-2-2026');
  });

  it('picks the STEP voucher over SMART for a Lower Silesian R&D project', () => {
    const result = assess(company({ voivodeship: 'dolnoslaskie', need: 'br' }));
    expect(result.best?.callId).toBe('innowacje-dla-step');
    expect(result.ranked[1]?.callId).toBe('sciezka-smart-msp');
  });

  it('picks the 7.4A training subsidy for a Lower Silesian SME that wants training', () => {
    const result = assess(company({ voivodeship: 'dolnoslaskie', need: 'szkolenia' }));
    expect(result.best?.callId).toBe('uslugi-rozwojowe-7-4a');
    // Dig.IT would still be possible (training as an additional cost), so it ranks next.
    expect(result.ranked[1]?.callId).toBe('digit-2-2026');
    expect(result.ranked[1]?.status).toBe('conditional');
  });

  it('returns no best match when every call is ineligible', () => {
    const result = assess(company({ size: 'duza' }));
    expect(result.best).toBeNull();
    expect(result.ranked).toHaveLength(4);
  });

  it('is deterministic for the same input', () => {
    expect(assess(base)).toEqual(assess(structuredClone(base)));
  });
});
