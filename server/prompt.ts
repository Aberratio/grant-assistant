import { getCall } from '../src/data/calls';
import type { Assessment } from '../src/domain/rules';
import type { CompanyProfile } from '../src/domain/types';
import type { Lang } from '../src/i18n/lang';

/** Language name the model is asked to write in. */
export const OUTPUT_LANGUAGE: Record<Lang, string> = { en: 'English', pl: 'Polish' };

/**
 * Fixed system prompt. Per-request data (including the output language) goes only
 * into the user message, so the system prompt stays byte-identical across requests.
 */
export const SYSTEM_PROMPT = `You are an assistant that helps small and medium-sized companies prepare an application for EU funding in Poland.

You receive:
- the company profile entered by the user,
- the result of deterministic eligibility rules for the best-matching funding call (each condition with the status met / unmet / uncertain),
- the call data (funding terms, window, notes, typical documents) as of the stated date,
- a short list of the other calls with their unmet conditions,
- outputLanguage: the language to write in.

Task: write a draft project description for the best-matching call and a list of documents to prepare. Write every text field in outputLanguage. Keep programme names, document names and institution names as given in the data.

Rules:
- The rules have already decided eligibility — do not judge eligibility again and do not change any condition status. Turn every "uncertain" condition into a concrete question in openQuestions.
- Use only the data in the message. Do not invent numbers, amounts, dates, supplier names or company results. Where data is missing, leave a clear placeholder in square brackets, e.g. [baseline: number of complaints in 2025].
- Sections: problem and current situation; solution and scope (stages); results and indicators; budget and schedule. Be specific and write in the register of a funding application, without marketing language.
- Documents: start from the call's document list and add, for each one, what this company needs to prepare and why. You may add a document if the conditions call for it.
- If another call also fits, you may mention it in openQuestions as an alternative.
- This is a working draft. It is not legal advice and does not guarantee funding; do not promise that funding will be awarded.`;

export interface Prompt {
  system: string;
  user: string;
}

export function buildPrompt(company: CompanyProfile, assessment: Assessment, lang: Lang): Prompt {
  const best = assessment.best;
  if (!best) throw new Error('buildPrompt: no eligible call to draft for');
  const call = getCall(best.callId, lang);

  const payload = {
    outputLanguage: OUTPUT_LANGUAGE[lang],
    company,
    bestMatch: {
      status: best.status,
      call: {
        id: call.id,
        name: call.name,
        operator: call.operator,
        stateAsOf: call.stateAsOf,
        window: call.window,
        funding: call.funding,
        notes: call.notes,
        documents: call.documents,
      },
      conditions: best.conditions,
    },
    otherCalls: assessment.ranked
      .filter((m) => m.callId !== best.callId)
      .map((m) => ({
        id: m.callId,
        name: getCall(m.callId, lang).name,
        status: m.status,
        unmet: m.conditions.filter((c) => c.status === 'unmet').map((c) => c.label),
      })),
  };

  return { system: SYSTEM_PROMPT, user: JSON.stringify(payload, null, 2) };
}
