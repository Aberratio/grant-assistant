import { describe, expect, it } from 'vitest';
import { canonicalJson, fnv1a, hashAssessmentInput } from './hash';
import { buildTimeline } from './playback';
import { templateDraft } from './template-draft';
import { assess } from './rules';
import { getCall } from '../data/calls';
import { FIXTURES } from '../fixtures/companies';
import type { Draft } from './draft';

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
    expect(fnv1a('żółć')).not.toBe(fnv1a('zolc'));
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
  const company = FIXTURES[0]!.company;

  it('is stable across key order', () => {
    const reordered = Object.fromEntries(Object.entries(company).reverse()) as typeof company;
    expect(hashAssessmentInput(reordered, assess(reordered).best)).toBe(
      hashAssessmentInput(company, assess(company).best),
    );
  });

  it('changes when any company field changes', () => {
    const before = hashAssessmentInput(company, assess(company).best);
    const edited = { ...company, description: company.description + ' ' };
    expect(hashAssessmentInput(edited, assess(edited).best)).not.toBe(before);
  });

  it('changes when the rule result changes for the same company', () => {
    const best = assess(company).best!;
    const altered = { ...best, conditions: best.conditions.slice(1) };
    expect(hashAssessmentInput(company, altered)).not.toBe(hashAssessmentInput(company, best));
  });
});

describe('buildTimeline', () => {
  const draft: Draft = {
    title: 'T',
    summary: 'Krótkie streszczenie.',
    sections: [
      { heading: 'A', body: 'x'.repeat(400) },
      { heading: 'B', body: 'y'.repeat(40) },
    ],
    documents: [{ name: 'Dok', note: 'n' }],
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

  it('caps the whole playback so the demo never feels slow', () => {
    const long = { ...draft, sections: Array(30).fill({ heading: 'H', body: 'z'.repeat(5000) }) };
    const steps = buildTimeline(long);
    expect(steps.at(-1)!.atMs).toBeLessThanOrEqual(4000);
  });

  it('collapses to zero delay when motion is reduced', () => {
    expect(buildTimeline(draft, { reducedMotion: true }).every((s) => s.atMs === 0)).toBe(true);
  });
});

describe('templateDraft', () => {
  it('returns null when nothing matches', () => {
    const company = { ...FIXTURES[0]!.company, size: 'duza' as const };
    expect(templateDraft(company, assess(company))).toBeNull();
  });

  it('uses the best call documents and turns open conditions into questions', () => {
    const fixture = FIXTURES.find((f) => f.id === 'ceramika-wartka')!;
    const result = assess(fixture.company);
    const draft = templateDraft(fixture.company, result)!;
    const call = getCall('digit-2-2026');
    expect(draft.documents.map((d) => d.name)).toEqual([...call.documents]);
    expect(draft.openQuestions).toHaveLength(2);
    expect(draft.openQuestions.join(' ')).toContain('Dodatni wynik finansowy');
    expect(draft.summary).toContain(fixture.company.name);
  });
});
