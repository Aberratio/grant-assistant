import { describe, expect, it } from 'vitest';
import { getCall } from '../data/calls';
import { DraftSchema } from '../domain/draft-schema';
import { hashAssessmentInput } from '../domain/hash';
import { assess } from '../domain/rules';
import { FICTIONAL_MARKER, FIXTURES } from '../fixtures/companies';
import { LANGS } from '../i18n/lang';
import { RECORDINGS, findRecording } from './index';

const cases = LANGS.flatMap((lang) => FIXTURES.map((f) => [`${lang}/${f.id}`, lang, f] as const));

// These tests run against the committed recordings on purpose (live corpus, not
// a frozen copy): their job is to catch a recording that went stale after a
// rule, data, translation or fixture change.
describe('recorded runs', () => {
  it.each(LANGS)('has exactly one %s recording per sample company', (lang) => {
    expect(
      RECORDINGS.filter((r) => r.lang === lang)
        .map((r) => r.fixtureId)
        .sort(),
    ).toEqual(FIXTURES.map((f) => f.id).sort());
  });

  describe.each(cases)('%s', (_name, lang, fixture) => {
    const recording = RECORDINGS.find((r) => r.lang === lang && r.fixtureId === fixture.id)!;
    const company = fixture.company[lang];
    const result = assess(company, lang);

    it('matches the current rule result (not stale)', () => {
      expect(result.best?.callId).toBe(recording.bestCallId);
      expect(recording.inputHash).toBe(hashAssessmentInput(company, result.best, lang));
    });

    it('is a valid draft', () => {
      expect(() => DraftSchema.parse(recording.draft)).not.toThrow();
      expect(recording.draft.sections.length).toBeGreaterThanOrEqual(3);
      expect(recording.draft.documents.length).toBeGreaterThanOrEqual(3);
    });

    it('names the company and the matched call', () => {
      const text = JSON.stringify(recording.draft);
      expect(text).toContain(company.name.replace(FICTIONAL_MARKER[lang], ''));
      const callShortName = getCall(recording.bestCallId, lang).name.split(' ')[0]!;
      expect(text).toContain(callShortName);
    });

    it('replays identically every time', () => {
      const first = findRecording(company, lang);
      const second = findRecording(structuredClone(company), lang);
      expect(first).not.toBeNull();
      expect(second).toEqual(first);
      expect(first?.draft).toEqual(recording.draft);
    });

    it('is only replayed in its own language', () => {
      const other = LANGS.find((l) => l !== lang)!;
      expect(findRecording(company, other)).toBeNull();
    });
  });

  it('every pair of language versions describes the same run', () => {
    for (const fixture of FIXTURES) {
      const versions = RECORDINGS.filter((r) => r.fixtureId === fixture.id);
      expect(new Set(versions.map((r) => r.bestCallId)).size, fixture.id).toBe(1);
      const shape = (r: (typeof versions)[number]) => [
        r.draft.sections.length,
        r.draft.documents.length,
        r.draft.openQuestions.length,
      ];
      expect(shape(versions[0]!), fixture.id).toEqual(shape(versions[1]!));
    }
  });

  it('does not replay a recording for edited input', () => {
    const company = { ...FIXTURES[0]!.company.en, closedFiscalYears: 13 };
    expect(findRecording(company, 'en')).toBeNull();
  });

  it('every recording states how it was produced, and only API runs name a model', () => {
    for (const r of RECORDINGS) {
      expect(r.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (r.source === 'api') expect(r.model).toMatch(/^claude-/);
      else expect([r.source, r.model]).toEqual(['prepared', null]);
    }
  });

  // Prepared recordings stand in for live output, so they follow the live prompt's
  // contract (server/prompt.ts): numbers, dates and facts not given in the input are
  // left as [placeholders] instead of being invented.
  it('prepared recordings leave unknown facts as [placeholders], like the live prompt asks', () => {
    for (const r of RECORDINGS.filter((x) => x.source === 'prepared')) {
      const body = r.draft.sections.map((s) => s.body).join('\n');
      expect(body, `${r.lang}/${r.fixtureId}`).toMatch(/\[[^\]]{3,}\]/);
    }
  });
});
