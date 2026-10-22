import { z } from 'zod';
import {
  COMPANY_SIZES,
  DE_MINIMIS,
  INDUSTRIES,
  LIMITS,
  NEEDS,
  VOIVODESHIPS,
  type CompanyProfile,
} from '../src/domain/types';
import { FALLBACK_LANG, LANGS } from '../src/i18n/lang';

/** Validates the company profile posted by the browser before anything else runs. */
export const CompanySchema = z
  .object({
    name: z.string().trim().min(1).max(LIMITS.nameMaxLength),
    industry: z.enum(INDUSTRIES),
    size: z.enum(COMPANY_SIZES),
    voivodeship: z.enum(VOIVODESHIPS),
    closedFiscalYears: z.number().int().min(0).max(LIMITS.maxClosedFiscalYears),
    netResultPln: z.number().finite().nullable(),
    deMinimisAvailable: z.enum(DE_MINIMIS),
    need: z.enum(NEEDS),
    description: z.string().max(LIMITS.descriptionMaxLength),
  })
  .strict();

/** `lang` selects the wording of the rule result and the draft; it defaults to English. */
export const DraftRequestSchema = z.object({
  company: CompanySchema,
  lang: z.enum(LANGS).default(FALLBACK_LANG),
});

// Compile-time guard: the schema output must be a CompanyProfile.
export const companyTypesAgree: z.infer<typeof CompanySchema> extends CompanyProfile
  ? true
  : never = true;
