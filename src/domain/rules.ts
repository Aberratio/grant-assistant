/**
 * Deterministic eligibility rules. No LLM is involved here: the model only gets
 * the result of these rules and writes the draft for the best match.
 */
import { CALLS, getCall, type FundingCall } from '../data/calls';
import type {
  CallMatch,
  CompanyProfile,
  ConditionResult,
  ConditionStatus,
  MatchStatus,
  Need,
} from './types';

export interface Assessment {
  /** Every known call, best first. */
  ranked: CallMatch[];
  /** First call that is not ineligible, or null. */
  best: CallMatch | null;
}

export const DIGIT_MIN_CLOSED_YEARS = 5;

const NEED_LABEL: Record<Need, string> = {
  cyfryzacja: 'wdrożenie technologii cyfrowych',
  br: 'prace badawczo-rozwojowe (B+R)',
  szkolenia: 'szkolenia i usługi rozwojowe',
};

const cond = (
  id: string,
  label: string,
  status: ConditionStatus,
  detail: string,
): ConditionResult => ({ id, label, status, detail });

function sme(company: CompanyProfile): ConditionResult {
  return company.size === 'duza'
    ? cond('msp', 'Status MŚP', 'unmet', 'Nabór jest tylko dla mikro, małych i średnich firm.')
    : cond(
        'msp',
        'Status MŚP',
        'met',
        'Firma deklaruje status mikro, małego lub średniego przedsiębiorstwa.',
      );
}

function lowerSilesia(company: CompanyProfile): ConditionResult {
  return company.voivodeship === 'dolnoslaskie'
    ? cond(
        'region',
        'Siedziba na Dolnym Śląsku',
        'met',
        'Firma działa w województwie dolnośląskim.',
      )
    : cond(
        'region',
        'Siedziba na Dolnym Śląsku',
        'unmet',
        'Program finansuje tylko firmy z województwa dolnośląskiego.',
      );
}

function scope(company: CompanyProfile, call: FundingCall, label: string): ConditionResult {
  return call.needs.includes(company.need)
    ? cond(
        'zakres',
        label,
        'met',
        `Potrzeba firmy (${NEED_LABEL[company.need]}) mieści się w zakresie naboru.`,
      )
    : cond(
        'zakres',
        label,
        'unmet',
        `Nabór finansuje: ${call.needs.map((n) => NEED_LABEL[n]).join(', ')} — a nie ${NEED_LABEL[company.need]}.`,
      );
}

function digitConditions(company: CompanyProfile): ConditionResult[] {
  const manufacturing =
    company.industry === 'produkcja' || company.industry === 'uslugi_produkcyjne';
  const years = company.closedFiscalYears;
  const missingYears = DIGIT_MIN_CLOSED_YEARS - years;
  const net = company.netResultPln;

  const scopeByNeed: Record<Need, ConditionResult> = {
    cyfryzacja: cond(
      'zakres',
      'Projekt wdraża technologie cyfrowe',
      'met',
      'Dig.IT finansuje gotowe i dedykowane technologie cyfrowe, w tym AI, analitykę i automatyzację.',
    ),
    szkolenia: cond(
      'zakres',
      'Projekt wdraża technologie cyfrowe',
      'uncertain',
      'Szkolenia są kwalifikowalne tylko jako koszt dodatkowy (do 40%) przy wdrożeniu technologii cyfrowej.',
    ),
    br: cond(
      'zakres',
      'Projekt wdraża technologie cyfrowe',
      'uncertain',
      'Dig.IT finansuje wdrożenie technologii cyfrowych, nie prace B+R — pasuje tylko, jeśli projekt jest wdrożeniem.',
    ),
  };

  return [
    sme(company),
    manufacturing
      ? cond(
          'branza',
          'Przetwórstwo przemysłowe lub usługi produkcyjne',
          'met',
          'Główna działalność to produkcja lub usługi produkcyjne.',
        )
      : cond(
          'branza',
          'Przetwórstwo przemysłowe lub usługi produkcyjne',
          'unmet',
          'Dig.IT jest dla firm, których główną działalnością jest przetwórstwo przemysłowe lub usługi produkcyjne.',
        ),
    missingYears <= 0
      ? cond(
          'lata',
          `Co najmniej ${DIGIT_MIN_CLOSED_YEARS} zamkniętych lat obrotowych`,
          'met',
          `Firma ma ${years} zamkniętych lat obrotowych.`,
        )
      : cond(
          'lata',
          `Co najmniej ${DIGIT_MIN_CLOSED_YEARS} zamkniętych lat obrotowych`,
          'unmet',
          `Firma ma ${years} zamkniętych lat obrotowych — brakuje ${missingYears}.`,
        ),
    net === null
      ? cond(
          'wynik',
          'Dodatni wynik finansowy',
          'uncertain',
          'Brak danych o wyniku netto za ostatni zamknięty rok — sprawdź w sprawozdaniu.',
        )
      : net > 0
        ? cond(
            'wynik',
            'Dodatni wynik finansowy',
            'met',
            'Wynik netto za ostatni zamknięty rok jest dodatni.',
          )
        : cond(
            'wynik',
            'Dodatni wynik finansowy',
            'unmet',
            net === 0
              ? 'Wynik netto wynosi zero — warunek wymaga wyniku dodatniego.'
              : 'Wynik netto za ostatni zamknięty rok jest ujemny.',
          ),
    company.deMinimisAvailable === 'tak'
      ? cond(
          'de-minimis',
          'Wolny limit pomocy de minimis',
          'met',
          'Firma deklaruje niewykorzystany limit de minimis.',
        )
      : company.deMinimisAvailable === 'nie'
        ? cond(
            'de-minimis',
            'Wolny limit pomocy de minimis',
            'unmet',
            'Grant jest pomocą de minimis — bez wolnego limitu nie można go otrzymać.',
          )
        : cond(
            'de-minimis',
            'Wolny limit pomocy de minimis',
            'uncertain',
            'Sprawdź pomoc de minimis z ostatnich 3 lat w SUDOP — grant musi zmieścić się w limicie.',
          ),
    scopeByNeed[company.need],
  ];
}

const RULES: Record<string, (company: CompanyProfile, call: FundingCall) => ConditionResult[]> = {
  'digit-2-2026': (company) => digitConditions(company),
  'innowacje-dla-step': (company, call) => [
    sme(company),
    lowerSilesia(company),
    scope(company, call, 'Usługa badawcza (B+R) od jednostki naukowej'),
  ],
  'uslugi-rozwojowe-7-4a': (company, call) => [
    sme(company),
    lowerSilesia(company),
    scope(company, call, 'Usługa rozwojowa z Bazy Usług Rozwojowych'),
  ],
  'sciezka-smart-msp': (company, call) => [
    sme(company),
    scope(company, call, 'Projekt obejmuje obowiązkowy moduł B+R'),
  ],
};

function statusOf(conditions: readonly ConditionResult[]): MatchStatus {
  if (conditions.some((c) => c.status === 'unmet')) return 'ineligible';
  if (conditions.some((c) => c.status === 'uncertain')) return 'conditional';
  return 'eligible';
}

export function evaluateCall(company: CompanyProfile, callId: string): CallMatch {
  const call = getCall(callId);
  const rules = RULES[call.id];
  if (!rules) throw new Error(`No rules for funding call: ${call.id}`);
  const conditions = rules(company, call);
  return { callId: call.id, status: statusOf(conditions), conditions };
}

const STATUS_ORDER: Record<MatchStatus, number> = { eligible: 0, conditional: 1, ineligible: 2 };

const openQuestions = (m: CallMatch) => m.conditions.filter((c) => c.status === 'uncertain').length;

const curatedOrder = (callId: string) => CALLS.findIndex((c) => c.id === callId);

/** Status first, then fewer open questions, then the curated call order. */
export function rank(matches: readonly CallMatch[]): CallMatch[] {
  return [...matches].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      openQuestions(a) - openQuestions(b) ||
      curatedOrder(a.callId) - curatedOrder(b.callId),
  );
}

export function assess(company: CompanyProfile): Assessment {
  const ranked = rank(CALLS.map((call) => evaluateCall(company, call.id)));
  const best = ranked.find((m) => m.status !== 'ineligible') ?? null;
  return { ranked, best };
}
