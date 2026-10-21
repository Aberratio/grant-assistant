import { getCall } from '../src/data/calls';
import type { Assessment } from '../src/domain/rules';
import type { CompanyProfile } from '../src/domain/types';

/**
 * Fixed system prompt. Per-request data goes only into the user message, so the
 * system prompt stays byte-identical across requests.
 */
export const SYSTEM_PROMPT = `Jesteś asystentem, który pomaga małym i średnim firmom przygotować wniosek o dotację z funduszy UE.

Dostajesz:
- profil firmy podany przez użytkownika,
- wynik deterministycznych reguł kwalifikowalności dla najlepiej dopasowanego naboru (każdy warunek ze statusem met / unmet / uncertain),
- dane naboru (warunki finansowania, termin, uwagi, typowe dokumenty) ze stanu na podaną datę,
- krótką listę pozostałych naborów z niespełnionymi warunkami.

Zadanie: napisz po polsku szkic opisu projektu dla najlepiej dopasowanego naboru oraz listę dokumentów do przygotowania.

Zasady:
- Reguły już rozstrzygnęły kwalifikowalność — nie oceniaj kwalifikowalności ponownie i nie zmieniaj statusów warunków. Każdy warunek „uncertain” zamień na konkretne pytanie w openQuestions.
- Opieraj się wyłącznie na danych z wiadomości. Nie wymyślaj liczb, kwot, dat, nazw dostawców ani wyników firmy. Gdzie brakuje danych, zostaw wyraźne miejsce do uzupełnienia w nawiasach kwadratowych, np. [wartość bazowa: liczba reklamacji w 2025 r.].
- Sekcje: problem i stan obecny; rozwiązanie i zakres (etapy); rezultaty i wskaźniki; budżet i harmonogram. Pisz konkretnie, językiem wniosku, bez marketingu.
- Dokumenty: zacznij od listy dokumentów naboru i dopisz do każdego, co ta firma musi przygotować i dlaczego. Możesz dodać dokument, jeśli wynika z warunków.
- Jeśli inny nabór też pasuje, możesz wspomnieć o nim w openQuestions jako o alternatywie.
- To szkic roboczy, który nie jest poradą prawną ani gwarancją dotacji; nie obiecuj przyznania środków.`;

export interface Prompt {
  system: string;
  user: string;
}

export function buildPrompt(company: CompanyProfile, assessment: Assessment): Prompt {
  const best = assessment.best;
  if (!best) throw new Error('buildPrompt: no eligible call to draft for');
  const call = getCall(best.callId);

  const payload = {
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
        name: getCall(m.callId).name,
        status: m.status,
        unmet: m.conditions.filter((c) => c.status === 'unmet').map((c) => c.label),
      })),
  };

  return { system: SYSTEM_PROMPT, user: JSON.stringify(payload, null, 2) };
}
