import {
  COMPANY_SIZES,
  DE_MINIMIS,
  INDUSTRIES,
  LIMITS,
  NEEDS,
  VOIVODESHIPS,
  type CompanyProfile,
} from '../domain/types';

export type FormEntries = Record<keyof CompanyProfile, string>;

export type ParseResult =
  | { ok: true; company: CompanyProfile }
  | { ok: false; errors: Partial<Record<keyof CompanyProfile, string>> };

function oneOf<T extends string>(options: readonly T[], value: string): T | undefined {
  return (options as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** "-120 000,50" → -120000.5; "" → null; garbage → NaN. */
function parsePolishNumber(raw: string): number | null {
  // \s also matches the no-break space Polish number formatting uses.
  const compact = raw.replace(/\s/g, '').replace(',', '.');
  if (compact === '') return null;
  return /^-?\d+(\.\d+)?$/.test(compact) ? Number(compact) : Number.NaN;
}

export function parseCompany(entries: FormEntries): ParseResult {
  const errors: Partial<Record<keyof CompanyProfile, string>> = {};
  const name = entries.name.trim();
  if (!name) errors.name = 'Podaj nazwę firmy.';
  else if (name.length > LIMITS.nameMaxLength) {
    errors.name = `Nazwa może mieć najwyżej ${LIMITS.nameMaxLength} znaków.`;
  }
  const description = entries.description.trim();
  if (description.length > LIMITS.descriptionMaxLength) {
    errors.description = `Opis może mieć najwyżej ${LIMITS.descriptionMaxLength} znaków.`;
  }

  const industry = oneOf(INDUSTRIES, entries.industry);
  if (!industry) errors.industry = 'Wybierz branżę.';
  const size = oneOf(COMPANY_SIZES, entries.size);
  if (!size) errors.size = 'Wybierz wielkość firmy.';
  const voivodeship = oneOf(VOIVODESHIPS, entries.voivodeship);
  if (!voivodeship) errors.voivodeship = 'Wybierz województwo.';
  const deMinimisAvailable = oneOf(DE_MINIMIS, entries.deMinimisAvailable);
  if (!deMinimisAvailable) errors.deMinimisAvailable = 'Wybierz odpowiedź.';
  const need = oneOf(NEEDS, entries.need);
  if (!need) errors.need = 'Wybierz potrzebę.';

  const years = entries.closedFiscalYears.trim() === '' ? NaN : Number(entries.closedFiscalYears);
  if (!Number.isInteger(years) || years < 0 || years > LIMITS.maxClosedFiscalYears) {
    errors.closedFiscalYears = 'Podaj liczbę całkowitą lat (0 lub więcej).';
  }

  const netResultPln = parsePolishNumber(entries.netResultPln);
  if (Number.isNaN(netResultPln)) errors.netResultPln = 'Podaj kwotę w zł albo zostaw puste.';

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
