import { describe, expect, it } from 'vitest';
import { canonicalJson, fnv1a, hashAssessmentInput } from './hash';
import { buildTimeline } from './playback';
import { templateDraft } from './template-draft';
import { assess } from './rules';
import { getCall } from '../data/calls';
import { FIXTURES } from '../fixtures/companies';
import type { Draft } from './draft';
import { messages } from '../i18n/messages';

describe('fnv1a', () => {
  // Reference vectors from the FNV spec (32-bit FNV-1a).
  it.each([
    ['', '811c9dc5'],
    ['a', 'e40c292c'],
    ['foobar', 'bf9cf968'],
  ])('fnv1a(%j) = %s', (input, expected) => {
    expect(fnv1a(input)).toBe(expected);
  });

  it('hashes UTF-8 bytes, so Polish letters differ from their ASCII lookalikes', () => {
    expect(fnv1a('\u017c\u00f3\u0142\u0107')).not.toBe(fnv1a('zolc'));
  });
});

describe('canonicalJson', () => {
  it('sorts object keys at every depth', () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: null } })).toBe(
      '{"a":{"c":null,"d":[2,{"y":2,"z":1}]},"b":1}',
    );
  });
});

describe('hashAssessmentInput', () => {
  const company = FIXTURES[0]!.company.en;

  it('is stable across key order', () => {
    const reordered = Object.fromEntries(Object.entries(company).reverse()) as typeof company;
    expect(hashAssessmentInput(reordered, assess(reordered, 'en').best, 'en')).toBe(
      hashAssessmentInput(company, assess(company, 'en').best, 'en'),
    );
  });

  it('changes when any company field changes', () => {
    const before = hashAssessmentInput(company, assess(company, 'en').best, 'en');
    const edited = { ...company, description: company.description + ' ' };
    expect(hashAssessmentInput(edited, assess(edited, 'en').best, 'en')).not.toBe(before);
  });

  it('changes when any single company field changes', () => {
    const before = hashAssessmentInput(company, assess(company, 'en').best, 'en');
    const edits: Partial<typeof company>[] = [
      { name: company.name + 'x' },
      { industry: 'manufacturing_services' },
      { size: 'medium' },
      { voivodeship: 'slaskie' },
      { closedFiscalYears: company.closedFiscalYears + 1 },
      { netResultPln: null },
      { deMinimisAvailable: 'unknown' },
      { need: 'training' },
    ];
    for (const edit of edits) {
      const edited = { ...company, ...edit };
      expect(
        hashAssessmentInput(edited, assess(edited, 'en').best, 'en'),
        JSON.stringify(edit),
      ).not.toBe(before);
    }
  });

  it('changes when the matched call data changes (the model and recordings quote it)', () => {
    const best = assess(company, 'en').best!;
    const call = getCall(best.callId, 'en');
    const edited = { ...call, funding: call.funding + ' (changed)' };
    expect(hashAssessmentInput(company, best, 'en', edited)).not.toBe(
      hashAssessmentInput(company, best, 'en'),
    );
  });

  it('changes when the rule result changes for the same company', () => {
    const best = assess(company, 'en').best!;
    const altered = { ...best, conditions: best.conditions.slice(1) };
    expect(hashAssessmentInput(company, altered, 'en')).not.toBe(
      hashAssessmentInput(company, best, 'en'),
    );
  });
});

describe('buildTimeline', () => {
  const draft: Draft = {
    title: 'T',
    summary: 'A short summary.',
    sections: [
      { heading: 'A', body: 'x'.repeat(400) },
      { heading: 'B', body: 'y'.repeat(40) },
    ],
    documents: [{ name: 'Doc', note: 'n' }],
    openQuestions: ['?'],
  };

  it('reveals summary, sections in order, then documents and questions', () => {
    expect(buildTimeline(draft).map((s) => s.target)).toEqual([
      'summary',
      'section:0',
      'section:1',
      'documents',
      'questions',
    ]);
  });

  it('is identical for identical input and has strictly increasing offsets', () => {
    const a = buildTimeline(draft);
    expect(buildTimeline(structuredClone(draft))).toEqual(a);
    for (let i = 1; i < a.length; i++) expect(a[i]!.atMs).toBeGreaterThan(a[i - 1]!.atMs);
  });

  it('caps the whole playback so a replay never feels slow', () => {
    const long = { ...draft, sections: Array(30).fill({ heading: 'H', body: 'z'.repeat(5000) }) };
    const steps = buildTimeline(long);
    expect(steps.at(-1)!.atMs).toBeLessThanOrEqual(4000);
  });

  it('collapses to zero delay when motion is reduced', () => {
    expect(buildTimeline(draft, { reducedMotion: true }).every((s) => s.atMs === 0)).toBe(true);
  });
});

describe('templateDraft', () => {
  it('leaves a placeholder for an empty description and has no questions when nothing is uncertain', () => {
    const company = { ...FIXTURES[0]!.company.en, description: '   ' };
    const draft = templateDraft(company, assess(company, 'en'), 'en')!;
    expect(draft.sections[0]!.body).toContain('[describe the planned project');
    expect(draft.openQuestions).toEqual([]);
  });

  it('returns null when nothing matches', () => {
    const company = { ...FIXTURES[0]!.company.en, size: 'large' as const };
    expect(templateDraft(company, assess(company, 'en'), 'en')).toBeNull();
  });

  it('uses the best call documents and turns open conditions into questions', () => {
    const fixture = FIXTURES.find((f) => f.id === 'ceramika-wartka')!;
    const company = fixture.company.en;
    const result = assess(company, 'en');
    const draft = templateDraft(company, result, 'en')!;
    const call = getCall('digit-2-2026', 'en');
    expect(draft.documents.map((d) => d.name)).toEqual([...call.documents]);
    expect(draft.openQuestions).toHaveLength(2);
    expect(draft.openQuestions.join(' ')).toContain('Positive net result');
    expect(draft.summary).toContain(company.name);
  });
});

describe('language in the run identity', () => {
  it('gives the same input a different hash per language (each has its own recording)', () => {
    const company = FIXTURES[0]!.company.en;
    expect(hashAssessmentInput(company, assess(company, 'pl').best, 'pl')).not.toBe(
      hashAssessmentInput(company, assess(company, 'en').best, 'en'),
    );
  });

  it('writes the template draft in the requested language', () => {
    const company = FIXTURES[0]!.company.pl;
    const draft = templateDraft(company, assess(company, 'pl'), 'pl')!;
    const t = messages('pl').template;
    expect(draft.sections.map((s) => s.heading)).toEqual([
      t.problemHeading,
      t.solutionHeading,
      t.resultsHeading,
      t.budgetHeading,
    ]);
    expect(draft.documents.map((d) => d.name)).toEqual([
      ...getCall('digit-2-2026', 'pl').documents,
    ]);
  });
});
