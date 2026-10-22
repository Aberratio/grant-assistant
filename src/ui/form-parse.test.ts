import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../fixtures/companies';
import { LANGS } from '../i18n/lang';
import { messages } from '../i18n/messages';
import { companyToEntries, parseCompany } from './form-parse';

const entries = (overrides: Record<string, string> = {}) => ({
  name: 'Test Company (fictional)',
  industry: 'manufacturing',
  size: 'small',
  voivodeship: 'dolnoslaskie',
  closedFiscalYears: '5',
  netResultPln: '1000',
  deMinimisAvailable: 'yes',
  need: 'digital',
  description: '  Description  ',
  ...overrides,
});

describe('parseCompany', () => {
  it('parses a complete form', () => {
    const result = parseCompany(entries(), 'en');
    expect(result).toEqual({
      ok: true,
      company: {
        name: 'Test Company (fictional)',
        industry: 'manufacturing',
        size: 'small',
        voivodeship: 'dolnoslaskie',
        closedFiscalYears: 5,
        netResultPln: 1000,
        deMinimisAvailable: 'yes',
        need: 'digital',
        description: 'Description',
      },
    });
  });

  it('treats an empty net result as unknown', () => {
    const result = parseCompany(entries({ netResultPln: '' }), 'en');
    expect(result.ok && result.company.netResultPln).toBeNull();
  });

  it.each([
    ['-120 000,50', -120000.5],
    ['250,000', 250000],
    ['1,234.5', 1234.5],
    ['-40000', -40000],
    ['0,5', 0.5],
  ])('accepts Polish and English number formatting: %j → %d', (raw, expected) => {
    const result = parseCompany(entries({ netResultPln: raw }), 'en');
    expect(result.ok && result.company.netResultPln).toBe(expected);
  });

  it('accepts a no-break space as the thousands separator', () => {
    const nbsp = String.fromCharCode(160);
    const result = parseCompany(entries({ netResultPln: `410${nbsp}000` }), 'pl');
    expect(result.ok && result.company.netResultPln).toBe(410000);
  });

  it.each([
    ['closedFiscalYears', '-1'],
    ['closedFiscalYears', '2.5'],
    ['closedFiscalYears', ''],
    ['netResultPln', 'a lot'],
    ['netResultPln', '1,2,3'],
    ['industry', 'agriculture'],
    ['size', ''],
    ['name', '   '],
    ['name', 'x'.repeat(121)],
    ['description', 'x'.repeat(2001)],
    ['closedFiscalYears', '201'],
  ])('reports an error for %s (case %#)', (field, value) => {
    const result = parseCompany(entries({ [field]: value }), 'en');
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors)).toContain(field);
  });

  it.each(LANGS)('reports errors in the interface language (%s)', (lang) => {
    const result = parseCompany(entries({ name: ' ' }), lang);
    expect(!result.ok && result.errors.name).toBe(messages(lang).formErrors.nameRequired);
  });

  it('round-trips every sample company in both languages through the form', () => {
    for (const lang of LANGS) {
      for (const { company } of FIXTURES) {
        expect(parseCompany(companyToEntries(company[lang]), lang)).toEqual({
          ok: true,
          company: company[lang],
        });
      }
    }
  });
});
