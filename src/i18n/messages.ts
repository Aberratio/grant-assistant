/**
 * Shape of the interface dictionaries. `en.ts` and `pl.ts` both implement it, so a
 * missing or extra key is a type error; messages.test.ts checks the same at runtime.
 * Everything a visitor reads lives here: UI labels, rule explanations, the legal
 * notice and the template draft. Funding-call facts live in src/data/calls.ts.
 */
import type { ApiErrorCode } from '../domain/api';
import type {
  CompanySize,
  ConditionStatus,
  DeMinimis,
  Industry,
  MatchStatus,
  Need,
} from '../domain/types';
import type { AppMode } from '../ui/runtime';
import { en } from './en';
import type { Lang } from './lang';
import { pl } from './pl';

export interface Messages {
  meta: { title: string; description: string };
  app: {
    heading: string;
    lead: string;
    modeTitle: string;
    mode: Record<AppMode, string>;
    languageLabel: string;
    disclaimerTitle: string;
    disclaimer: (dataDate: string) => string;
    companyHeading: string;
    presetsLabel: string;
    matchesHeading: string;
    draftHeading: string;
    footerHeading: (dataDate: string) => string;
    sampleData: string;
  };
  form: {
    ariaLabel: string;
    name: string;
    industry: string;
    size: string;
    voivodeship: string;
    closedFiscalYears: string;
    netResult: string;
    netResultPlaceholder: string;
    netResultHint: string;
    deMinimis: string;
    need: string;
    description: string;
    descriptionPlaceholder: string;
    submit: string;
  };
  formErrors: {
    nameRequired: string;
    nameTooLong: (max: number) => string;
    descriptionTooLong: (max: number) => string;
    industry: string;
    size: string;
    voivodeship: string;
    deMinimis: string;
    need: string;
    closedFiscalYears: string;
    netResult: string;
  };
  labels: {
    industry: Record<Industry, string>;
    size: Record<CompanySize, string>;
    need: Record<Need, string>;
    deMinimis: Record<DeMinimis, string>;
    match: Record<MatchStatus, string>;
    condition: Record<ConditionStatus, string>;
  };
  match: {
    window: string;
    funding: string;
    sources: string;
    best: string;
    stateAsOf: (date: string) => string;
    allConditions: (stateAsOf: string) => string;
    notesAndSources: (stateAsOf: string) => string;
  };
  draft: {
    eyebrow: (callName: string) => string;
    documents: string;
    openQuestions: string;
    preparedOn: (date: string) => string;
    template: string;
    loading: string;
    switchedLanguage: string;
  };
  noMatch: {
    heading: string;
    body: string;
    closest: (callName: string) => string;
  };
  live: {
    noConnection: string;
    serverStatus: (status: number) => string;
    unknownError: string;
    apiErrors: Record<ApiErrorCode, string>;
  };
  rules: {
    need: Record<Need, string>;
    sme: { label: string; met: string; unmet: string };
    region: { label: string; met: string; unmet: string };
    scope: {
      met: (need: string) => string;
      unmet: (funded: string, need: string) => string;
      rndServiceLabel: string;
      developmentServiceLabel: string;
      rndModuleLabel: string;
    };
    digit: {
      scopeLabel: string;
      scope: Record<Need, string>;
      industryLabel: string;
      industryMet: string;
      industryUnmet: string;
      yearsLabel: (min: number) => string;
      yearsMet: (years: number) => string;
      yearsUnmet: (years: number, missing: number) => string;
      netLabel: string;
      netUnknown: string;
      netPositive: string;
      netZero: string;
      netNegative: string;
      deMinimisLabel: string;
      deMinimisYes: string;
      deMinimisNo: string;
      deMinimisUnknown: string;
    };
  };
  template: {
    goal: Record<Need, string>;
    descriptionPlaceholder: string;
    title: (goal: string, company: string) => string;
    summary: (company: string, goal: string, callName: string) => string;
    problemHeading: string;
    problemTodo: string;
    solutionHeading: string;
    solutionBody: string;
    resultsHeading: string;
    resultsBody: string;
    budgetHeading: string;
    budgetBody: (funding: string, window: string) => string;
    documentNote: string;
  };
}

export const MESSAGES: Record<Lang, Messages> = { en, pl };

export function messages(lang: Lang): Messages {
  return MESSAGES[lang];
}
