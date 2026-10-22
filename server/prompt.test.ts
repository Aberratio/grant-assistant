import { describe, expect, it } from 'vitest';
import { assess } from '../src/domain/rules';
import { getFixture } from '../src/fixtures/companies';
import { buildPrompt, SYSTEM_PROMPT } from './prompt';

describe('buildPrompt', () => {
  const company = getFixture('ceramika-wartka').company.en;
  const assessment = assess(company, 'en');
  const prompt = buildPrompt(company, assessment, 'en');

  it('keeps the system prompt fixed (no per-request data, so it caches)', () => {
    expect(prompt.system).toBe(SYSTEM_PROMPT);
    expect(SYSTEM_PROMPT).not.toContain(company.name);
  });

  it('tells the model the rules are decided and must not be re-judged', () => {
    expect(SYSTEM_PROMPT).toMatch(/do not judge eligibility again/i);
    expect(SYSTEM_PROMPT).toMatch(/not legal advice/i);
  });

  it('carries the company, the best call and every condition with its status', () => {
    const user = JSON.parse(prompt.user) as Record<string, unknown>;
    expect(user['company']).toEqual(company);
    const best = user['bestMatch'] as {
      call: { id: string; documents: string[] };
      conditions: { id: string; status: string }[];
    };
    expect(best.call.id).toBe('digit-2-2026');
    expect(best.conditions.map((c) => `${c.id}:${c.status}`)).toEqual([
      'sme:met',
      'sector:met',
      'years:met',
      'net-result:uncertain',
      'de-minimis:uncertain',
      'scope:met',
    ]);
    expect(best.call.documents.length).toBeGreaterThan(3);
  });

  it('lists the other calls with their unmet conditions, so the draft can mention alternatives', () => {
    const user = JSON.parse(prompt.user) as {
      otherCalls: { id: string; status: string; unmet: string[] }[];
    };
    expect(user.otherCalls.map((c) => c.id)).toEqual([
      'innowacje-dla-step',
      'uslugi-rozwojowe-7-4a',
      'sciezka-smart-msp',
    ]);
    expect(user.otherCalls[0]!.unmet).toContain('Registered in Lower Silesia');
  });

  it('asks for the output language in the user message, keeping the system prompt fixed', () => {
    const pl = getFixture('ceramika-wartka').company.pl;
    const polish = buildPrompt(pl, assess(pl, 'pl'), 'pl');
    expect(polish.system).toBe(prompt.system);
    expect(JSON.parse(polish.user)).toMatchObject({ outputLanguage: 'Polish' });
    expect(JSON.parse(prompt.user)).toMatchObject({ outputLanguage: 'English' });
  });

  it('throws when there is no best match (the server must not call the model then)', () => {
    const big = { ...company, size: 'large' as const };
    expect(() => buildPrompt(big, assess(big, 'en'), 'en')).toThrow('no eligible call');
  });
});
