import { describe, expect, it } from 'vitest';
import { getCall } from '../data/calls';
import { DraftSchema } from '../domain/draft-schema';
import { hashAssessmentInput } from '../domain/hash';
import { assess } from '../domain/rules';
import { FIXTURES } from '../fixtures/companies';
import { RECORDINGS, findRecording } from './index';

// These tests run against the committed recordings on purpose (live corpus, not
// a frozen copy): their job is to catch a recording that went stale after a
// rule, data or fixture change.
describe('recorded runs', () => {
  it('has exactly one recording per sample company', () => {
    expect(RECORDINGS.map((r) => r.fixtureId).sort()).toEqual(FIXTURES.map((f) => f.id).sort());
  });

  describe.each(FIXTURES.map((f) => [f.id, f] as const))('%s', (_id, fixture) => {
    const recording = RECORDINGS.find((r) => r.fixtureId === fixture.id)!;
    const result = assess(fixture.company);

    it('matches the current rule result (not stale)', () => {
      expect(result.best?.callId).toBe(recording.bestCallId);
      expect(recording.inputHash).toBe(hashAssessmentInput(fixture.company, result.best));
    });

    it('is a valid draft', () => {
      expect(() => DraftSchema.parse(recording.draft)).not.toThrow();
      expect(recording.draft.sections.length).toBeGreaterThanOrEqual(3);
      expect(recording.draft.documents.length).toBeGreaterThanOrEqual(3);
    });

    it('names the company and the matched call', () => {
      const text = JSON.stringify(recording.draft);
      expect(text).toContain(fixture.company.name.replace(' (fikcyjna)', ''));
      const callShortName = getCall(recording.bestCallId).name.split(' ')[0]!;
      expect(text).toContain(callShortName);
    });

    it('replays identically every time', () => {
      const first = findRecording(fixture.company);
      const second = findRecording(structuredClone(fixture.company));
      expect(first).not.toBeNull();
      expect(second).toEqual(first);
      expect(first?.draft).toEqual(recording.draft);
    });
  });

  it('does not replay a recording for edited input', () => {
    const company = { ...FIXTURES[0]!.company, closedFiscalYears: 13 };
    expect(findRecording(company)).toBeNull();
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
      expect(body, r.fixtureId).toMatch(/\[[^\]]{3,}\]/);
    }
  });
});
