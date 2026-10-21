import { z } from 'zod';
import {
  COMPANY_SIZES,
  DE_MINIMIS,
  INDUSTRIES,
  NEEDS,
  VOIVODESHIPS,
  type CompanyProfile,
} from '../src/domain/types';

/** Validates the company profile posted by the browser before anything else runs. */
export const CompanySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    industry: z.enum(INDUSTRIES),
    size: z.enum(COMPANY_SIZES),
    voivodeship: z.enum(VOIVODESHIPS),
    closedFiscalYears: z.number().int().min(0).max(200),
    netResultPln: z.number().finite().nullable(),
    deMinimisAvailable: z.enum(DE_MINIMIS),
    need: z.enum(NEEDS),
    description: z.string().max(2000),
  })
  .strict();

export const DraftRequestSchema = z.object({ company: CompanySchema });

// Compile-time guard: the schema output must be a CompanyProfile.
export const companyTypesAgree: z.infer<typeof CompanySchema> extends CompanyProfile
  ? true
  : never = true;
