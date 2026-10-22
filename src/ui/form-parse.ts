import {
  COMPANY_SIZES,
  DE_MINIMIS,
  INDUSTRIES,
  LIMITS,
  NEEDS,
  VOIVODESHIPS,
  type CompanyProfile,
} from '../domain/types';
import type { Lang } from '../i18n/lang';
import { messages } from '../i18n/messages';

export type FormEntries = Record<keyof CompanyProfile, string>;

export type ParseResult =
  | { ok: true; company: CompanyProfile }
  | { ok: false; errors: Partial<Record<keyof CompanyProfile, string>> };

function oneOf<T extends string>(options: readonly T[], value: string): T | undefined {
  return (options as readonly string[]).includes(value) ? (value as T) : undefined;
}

/**
 * Amount in Polish or English formatting: "-120 000,50" → -120000.5,
 * "250,000" → 250000, "1,234.5" → 1234.5; "" → null; garbage → NaN.
 */
function parseAmount(raw: string): number | null {
  // \s also matches the no-break space Polish number formatting uses.
  const spaced = raw.replace(/\s/g, '');
  const compact = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(spaced)
    ? spaced.replace(/,/g, '') // English thousands separators
    : spaced.replace(',', '.'); // Polish decimal comma
  if (compact === '') return null;
  return /^-?\d+(\.\d+)?$/.test(compact) ? Number(compact) : Number.NaN;
}

export function parseCompany(entries: FormEntries, lang: Lang): ParseResult {
  const t = messages(lang).formErrors;
  const errors: Partial<Record<keyof CompanyProfile, string>> = {};
  const name = entries.name.trim();
  if (!name) errors.name = t.nameRequired;
  else if (name.length > LIMITS.nameMaxLength) {
    errors.name = t.nameTooLong(LIMITS.nameMaxLength);
  }
  const description = entries.description.trim();
  if (description.length > LIMITS.descriptionMaxLength) {
    errors.description = t.descriptionTooLong(LIMITS.descriptionMaxLength);
  }

  const industry = oneOf(INDUSTRIES, entries.industry);
  if (!industry) errors.industry = t.industry;
  const size = oneOf(COMPANY_SIZES, entries.size);
  if (!size) errors.size = t.size;
  const voivodeship = oneOf(VOIVODESHIPS, entries.voivodeship);
  if (!voivodeship) errors.voivodeship = t.voivodeship;
  const deMinimisAvailable = oneOf(DE_MINIMIS, entries.deMinimisAvailable);
  if (!deMinimisAvailable) errors.deMinimisAvailable = t.deMinimis;
  const need = oneOf(NEEDS, entries.need);
  if (!need) errors.need = t.need;

  const years = entries.closedFiscalYears.trim() === '' ? NaN : Number(entries.closedFiscalYears);
  if (!Number.isInteger(years) || years < 0 || years > LIMITS.maxClosedFiscalYears) {
    errors.closedFiscalYears = t.closedFiscalYears;
  }

  const netResultPln = parseAmount(entries.netResultPln);
  if (Number.isNaN(netResultPln)) errors.netResultPln = t.netResult;

  if (
    Object.keys(errors).length > 0 ||
    !industry ||
    !size ||
    !voivodeship ||
    !deMinimisAvailable ||
    !need
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    company: {
      name,
      industry,
      size,
      voivodeship,
      closedFiscalYears: years,
      netResultPln,
      deMinimisAvailable,
      need,
      description,
    },
  };
}

export function companyToEntries(company: CompanyProfile): FormEntries {
  return {
    name: company.name,
    industry: company.industry,
    size: company.size,
    voivodeship: company.voivodeship,
    closedFiscalYears: String(company.closedFiscalYears),
    netResultPln: company.netResultPln === null ? '' : String(company.netResultPln),
    deMinimisAvailable: company.deMinimisAvailable,
    need: company.need,
    description: company.description,
  };
}
