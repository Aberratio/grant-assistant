/**
 * Deterministic fallback draft for the recorded mode when the input does not
 * match a recording (the visitor edited the form). It is clearly labelled as a
 * template in the UI; the AI-written draft needs `npm run dev:live`.
 */
import { getCall } from '../data/calls';
import type { Lang } from '../i18n/lang';
import { messages } from '../i18n/messages';
import type { Draft } from './draft';
import type { Assessment } from './rules';
import type { CompanyProfile } from './types';

export function templateDraft(
  company: CompanyProfile,
  assessment: Assessment,
  lang: Lang,
): Draft | null {
  const best = assessment.best;
  if (!best) return null;
  const t = messages(lang).template;
  const call = getCall(best.callId, lang);
  const goal = t.goal[company.need];
  const description = company.description.trim() || t.descriptionPlaceholder;

  return {
    title: t.title(goal, company.name),
    summary: t.summary(company.name, goal, call.name),
    sections: [
      { heading: t.problemHeading, body: `${description}\n\n${t.problemTodo}` },
      { heading: t.solutionHeading, body: t.solutionBody },
      { heading: t.resultsHeading, body: t.resultsBody },
      { heading: t.budgetHeading, body: t.budgetBody(call.funding, call.window) },
    ],
    documents: call.documents.map((name) => ({ name, note: t.documentNote })),
    openQuestions: best.conditions
      .filter((c) => c.status === 'uncertain')
      .map((c) => `${c.label}: ${c.detail}`),
  };
}
