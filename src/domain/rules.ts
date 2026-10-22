/**
 * Deterministic eligibility rules. No LLM is involved here: the model only gets
 * the result of these rules and writes the draft for the best match.
 *
 * The decision (each condition's status) does not depend on the language; `lang`
 * only selects the wording of labels and explanations.
 */
import { CALL_IDS, getCall, type FundingCall } from '../data/calls';
import type { Lang } from '../i18n/lang';
import { messages, type Messages } from '../i18n/messages';
import type {
  CallMatch,
  CompanyProfile,
  ConditionResult,
  ConditionStatus,
  MatchStatus,
} from './types';

export interface Assessment {
  /** Every known call, best first. */
  ranked: CallMatch[];
  /** First call that is not ineligible, or null. */
  best: CallMatch | null;
}

export const DIGIT_MIN_CLOSED_YEARS = 5;

type RuleText = Messages['rules'];

const cond = (
  id: string,
  label: string,
  status: ConditionStatus,
  detail: string,
): ConditionResult => ({ id, label, status, detail });

function sme(company: CompanyProfile, t: RuleText): ConditionResult {
  return company.size === 'large'
    ? cond('sme', t.sme.label, 'unmet', t.sme.unmet)
    : cond('sme', t.sme.label, 'met', t.sme.met);
}

function lowerSilesia(company: CompanyProfile, t: RuleText): ConditionResult {
  return company.voivodeship === 'dolnoslaskie'
    ? cond('region', t.region.label, 'met', t.region.met)
    : cond('region', t.region.label, 'unmet', t.region.unmet);
}

function scope(
  company: CompanyProfile,
  call: FundingCall,
  label: string,
  t: RuleText,
): ConditionResult {
  return call.needs.includes(company.need)
    ? cond('scope', label, 'met', t.scope.met(t.need[company.need]))
    : cond(
        'scope',
        label,
        'unmet',
        t.scope.unmet(call.needs.map((n) => t.need[n]).join(', '), t.need[company.need]),
      );
}

function digitConditions(company: CompanyProfile, t: RuleText): ConditionResult[] {
  const d = t.digit;
  const manufacturing =
    company.industry === 'manufacturing' || company.industry === 'manufacturing_services';
  const years = company.closedFiscalYears;
  const missingYears = DIGIT_MIN_CLOSED_YEARS - years;
  const net = company.netResultPln;
  const yearsLabel = d.yearsLabel(DIGIT_MIN_CLOSED_YEARS);

  const scopeStatus: Record<CompanyProfile['need'], ConditionStatus> = {
    digital: 'met',
    training: 'uncertain',
    rnd: 'uncertain',
  };

  return [
    sme(company, t),
    manufacturing
      ? cond('sector', d.industryLabel, 'met', d.industryMet)
      : cond('sector', d.industryLabel, 'unmet', d.industryUnmet),
    missingYears <= 0
      ? cond('years', yearsLabel, 'met', d.yearsMet(years))
      : cond('years', yearsLabel, 'unmet', d.yearsUnmet(years, missingYears)),
    net === null
      ? cond('net-result', d.netLabel, 'uncertain', d.netUnknown)
      : net > 0
        ? cond('net-result', d.netLabel, 'met', d.netPositive)
        : cond('net-result', d.netLabel, 'unmet', net === 0 ? d.netZero : d.netNegative),
    company.deMinimisAvailable === 'yes'
      ? cond('de-minimis', d.deMinimisLabel, 'met', d.deMinimisYes)
      : company.deMinimisAvailable === 'no'
        ? cond('de-minimis', d.deMinimisLabel, 'unmet', d.deMinimisNo)
        : cond('de-minimis', d.deMinimisLabel, 'uncertain', d.deMinimisUnknown),
    cond('scope', d.scopeLabel, scopeStatus[company.need], d.scope[company.need]),
  ];
}

type Rule = (company: CompanyProfile, call: FundingCall, t: RuleText) => ConditionResult[];

const RULES: Record<string, Rule> = {
  'digit-2-2026': (company, _call, t) => digitConditions(company, t),
  'innowacje-dla-step': (company, call, t) => [
    sme(company, t),
    lowerSilesia(company, t),
    scope(company, call, t.scope.rndServiceLabel, t),
  ],
  'uslugi-rozwojowe-7-4a': (company, call, t) => [
    sme(company, t),
    lowerSilesia(company, t),
    scope(company, call, t.scope.developmentServiceLabel, t),
  ],
  'sciezka-smart-msp': (company, call, t) => [
    sme(company, t),
    scope(company, call, t.scope.rndModuleLabel, t),
  ],
};

function statusOf(conditions: readonly ConditionResult[]): MatchStatus {
  if (conditions.some((c) => c.status === 'unmet')) return 'ineligible';
  if (conditions.some((c) => c.status === 'uncertain')) return 'conditional';
  return 'eligible';
}

export function evaluateCall(company: CompanyProfile, callId: string, lang: Lang): CallMatch {
  const call = getCall(callId, lang);
  const rules = RULES[call.id];
  if (!rules) throw new Error(`No rules for funding call: ${call.id}`);
  const conditions = rules(company, call, messages(lang).rules);
  return { callId: call.id, status: statusOf(conditions), conditions };
}

const STATUS_ORDER: Record<MatchStatus, number> = { eligible: 0, conditional: 1, ineligible: 2 };

const openQuestions = (m: CallMatch) => m.conditions.filter((c) => c.status === 'uncertain').length;

const curatedOrder = (callId: string) => CALL_IDS.indexOf(callId);

/** Status first, then fewer open questions, then the curated call order. */
export function rank(matches: readonly CallMatch[]): CallMatch[] {
  return [...matches].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      openQuestions(a) - openQuestions(b) ||
      curatedOrder(a.callId) - curatedOrder(b.callId),
  );
}

export function assess(company: CompanyProfile, lang: Lang): Assessment {
  const ranked = rank(CALL_IDS.map((id) => evaluateCall(company, id, lang)));
  const best = ranked.find((m) => m.status !== 'ineligible') ?? null;
  return { ranked, best };
}
