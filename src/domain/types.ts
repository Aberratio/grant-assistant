/** Company profile entered in the form. All companies in this repo are fictional. */
export const INDUSTRIES = [
  'manufacturing',
  'manufacturing_services',
  'it',
  'retail',
  'services',
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const COMPANY_SIZES = ['micro', 'small', 'medium', 'large'] as const;
export type CompanySize = (typeof COMPANY_SIZES)[number];

/** Polish voivodeships (regions); ids are their ASCII-folded Polish names. */
export const VOIVODESHIPS = [
  'dolnoslaskie',
  'kujawsko-pomorskie',
  'lubelskie',
  'lubuskie',
  'lodzkie',
  'malopolskie',
  'mazowieckie',
  'opolskie',
  'podkarpackie',
  'podlaskie',
  'pomorskie',
  'slaskie',
  'swietokrzyskie',
  'warminsko-mazurskie',
  'wielkopolskie',
  'zachodniopomorskie',
] as const;
export type Voivodeship = (typeof VOIVODESHIPS)[number];

/** What the company wants to finance. */
export const NEEDS = ['digital', 'rnd', 'training'] as const;
export type Need = (typeof NEEDS)[number];

export const DE_MINIMIS = ['yes', 'no', 'unknown'] as const;
export type DeMinimis = (typeof DE_MINIMIS)[number];

/** Input limits shared by the form (client) and the API schema (server). */
export const LIMITS = {
  nameMaxLength: 120,
  descriptionMaxLength: 2000,
  maxClosedFiscalYears: 200,
} as const;

export interface CompanyProfile {
  name: string;
  industry: Industry;
  size: CompanySize;
  voivodeship: Voivodeship;
  /** Number of closed (full) fiscal years. */
  closedFiscalYears: number;
  /** Net result of the last closed fiscal year in PLN; null = unknown. */
  netResultPln: number | null;
  /** Is there unused de minimis limit left? */
  deMinimisAvailable: DeMinimis;
  need: Need;
  /** Short free-text description of the planned project. */
  description: string;
}

export type ConditionStatus = 'met' | 'unmet' | 'uncertain';

export interface ConditionResult {
  id: string;
  label: string;
  status: ConditionStatus;
  detail: string;
}

export type MatchStatus = 'eligible' | 'conditional' | 'ineligible';

export interface CallMatch {
  callId: string;
  status: MatchStatus;
  conditions: ConditionResult[];
}
