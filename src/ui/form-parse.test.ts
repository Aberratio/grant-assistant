import { describe, expect, it } from 'vitest';
import { FIXTURES } from '../fixtures/companies';
import { companyToEntries, parseCompany } from './form-parse';

const entries = (overrides: Record<string, string> = {}) => ({
  name: 'Firma Testowa (fikcyjna)',
  industry: 'produkcja',
  size: 'mala',
  voivodeship: 'dolnoslaskie',
  closedFiscalYears: '5',
  netResultPln: '1000',
  deMinimisAvailable: 'tak',
  need: 'cyfryzacja',
  description: '  Opis  ',
  ...overrides,
});

describe('parseCompany', () => {
  it('parses a complete form', () => {
    const result = parseCompany(entries());
    expect(result).toEqual({
      ok: true,
      company: {
        name: 'Firma Testowa (fikcyjna)',
        industry: 'produkcja',
        size: 'mala',
        voivodeship: 'dolnoslaskie',
        closedFiscalYears: 5,
        netResultPln: 1000,
        deMinimisAvailable: 'tak',
        need: 'cyfryzacja',
        description: 'Opis',
      },
    });
  });

  it('treats an empty net result as unknown', () => {
    const result = parseCompany(entries({ netResultPln: '' }));
    expect(result.ok && result.company.netResultPln).toBeNull();
  });

  it('accepts Polish number formatting for the net result', () => {
    const result = parseCompany(entries({ netResultPln: '-120 000,50' }));
    expect(result.ok && result.company.netResultPln).toBe(-120000.5);
  });

  it('accepts a no-break space as the thousands separator', () => {
    const nbsp = String.fromCharCode(160);
    const result = parseCompany(entries({ netResultPln: `410${nbsp}000` }));
    expect(result.ok && result.company.netResultPln).toBe(410000);
  });

  it.each([
    ['closedFiscalYears', '-1'],
    ['closedFiscalYears', '2.5'],
    ['closedFiscalYears', ''],
    ['netResultPln', 'dużo'],
    ['industry', 'rolnictwo'],
    ['size', ''],
    ['name', '   '],
    ['name', 'x'.repeat(121)],
    ['description', 'x'.repeat(2001)],
    ['closedFiscalYears', '201'],
  ])('reports an error for %s (case %#)', (field, value) => {
    const result = parseCompany(entries({ [field]: value }));
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors)).toContain(field);
  });

  it('round-trips every sample company through the form', () => {
    for (const { company } of FIXTURES) {
      expect(parseCompany(companyToEntries(company))).toEqual({ ok: true, company });
    }
  });
});
