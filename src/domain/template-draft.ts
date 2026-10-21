/**
 * Deterministic fallback draft for the recorded mode when the input does not
 * match a recording (the visitor edited the form). It is clearly labelled as a
 * template in the UI; the AI-written draft needs `npm run dev:live`.
 */
import { getCall } from '../data/calls';
import type { Draft } from './draft';
import type { Assessment } from './rules';
import type { CompanyProfile } from './types';

const NEED_GOAL: Record<CompanyProfile['need'], string> = {
  cyfryzacja: 'wdrożenie technologii cyfrowych',
  br: 'przeprowadzenie prac badawczo-rozwojowych',
  szkolenia: 'podniesienie kompetencji zespołu',
};

export function templateDraft(company: CompanyProfile, assessment: Assessment): Draft | null {
  const best = assessment.best;
  if (!best) return null;
  const call = getCall(best.callId);
  const description = company.description.trim() || '[opisz planowany projekt w 3–5 zdaniach]';

  return {
    title: `[Tytuł projektu] — ${NEED_GOAL[company.need]} w ${company.name}`,
    summary: `${company.name} planuje ${NEED_GOAL[company.need]} w ramach naboru „${call.name}”. To szablon do uzupełnienia — szkic pisany przez AI powstaje w trybie live.`,
    sections: [
      {
        heading: 'Problem i stan obecny',
        body: `${description}\n\n[Uzupełnij: jakie procesy dziś działają źle, ile to kosztuje (czas, braki, reklamacje), jak to mierzysz.]`,
      },
      {
        heading: 'Rozwiązanie i zakres projektu',
        body: '[Uzupełnij: co dokładnie zostanie wdrożone lub zbadane, w jakich etapach, kto jest wykonawcą.]',
      },
      {
        heading: 'Rezultaty i wskaźniki',
        body: '[Uzupełnij: mierzalne efekty po projekcie — np. czas, odsetek wad, przychód — z wartością bazową i docelową.]',
      },
      {
        heading: 'Budżet i harmonogram',
        body: `Warunki finansowania: ${call.funding}. Termin naboru: ${call.window}.\n\n[Uzupełnij: koszty kwalifikowane, wkład własny, kamienie milowe.]`,
      },
    ],
    documents: call.documents.map((name) => ({
      name,
      note: 'Sprawdź aktualny wzór w dokumentacji naboru.',
    })),
    openQuestions: best.conditions
      .filter((c) => c.status === 'uncertain')
      .map((c) => `${c.label}: ${c.detail}`),
  };
}
