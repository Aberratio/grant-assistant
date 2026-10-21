/**
 * Funding calls known to the assistant. Facts come from the personal-brand
 * research note of 2026-10-21 (nabory UE), cross-checked on the linked pages on
 * 2026-10-21. Always verify the rules (regulamin) at the source.
 */
import type { Need } from '../domain/types';

export interface Source {
  label: string;
  url: string;
}

export interface FundingCall {
  id: string;
  name: string;
  operator: string;
  /** Date the facts below were last checked. */
  stateAsOf: string;
  window: string;
  funding: string;
  /** Needs this call finances; used in the "scope" condition. */
  needs: readonly Need[];
  /** Static facts the applicant must act on; they do not change eligibility. */
  notes: readonly string[];
  /** Documents typically required for the application. */
  documents: readonly string[];
  sources: readonly Source[];
}

export const DATA_STATE_AS_OF = '2026-10-21';

/**
 * Order matters: it is the curated tie-break when two calls have the same
 * eligibility status and the same number of open questions (see rank()).
 * Smaller, simpler instruments come before large formal ones.
 */
export const CALLS: readonly FundingCall[] = [
  {
    id: 'digit-2-2026',
    name: 'Dig.IT Transformacja cyfrowa — konkurs 2/2026',
    operator: 'Agencja Rozwoju Przemysłu (ARP)',
    stateAsOf: DATA_STATE_AS_OF,
    window: '2–30 listopada 2026 (może zostać skrócony przy 200% alokacji, min. 10 dni)',
    funding:
      'Grant 150–850 tys. zł, do 50% kosztów kwalifikowanych, pomoc de minimis, refundacja po projekcie; grant nie więcej niż 30% średnich rocznych przychodów netto z 3 lat',
    needs: ['cyfryzacja'],
    notes: [
      'Projekt nie może rozpocząć się przed złożeniem wniosku.',
      'Wniosek wymaga co najmniej 3 ofert cenowych od wykonawców — zbierz je przed naborem.',
      'Szkolenia, środki trwałe i materiały tylko jako koszty dodatkowe (do 40% kosztów kwalifikowanych).',
      'Warunek dodatniego wyniku finansowego pochodzi z researchu regulaminu — potwierdź go w regulaminie konkursu.',
    ],
    documents: [
      'Wniosek o powierzenie grantu (zał. 2)',
      'Oświadczenie dot. sprawozdań finansowych (zał. 4) oraz sprawozdania za 5 zamkniętych lat obrotowych',
      'Upoważnienie do weryfikacji w BIG InfoMonitor i BIK (zał. 5)',
      'Oświadczenie dot. dokumentacji papierowej (zał. 6)',
      'Co najmniej 3 oferty cenowe na planowane technologie cyfrowe',
      'Zestawienie pomocy de minimis otrzymanej w ostatnich 3 latach',
    ],
    sources: [
      {
        label: 'ARP — konkurs 2/2026',
        url: 'https://digit.arp.pl/eventy/nabory/digit-konkurs-22026/',
      },
      {
        label: 'nowoczesnagospodarka.gov.pl — ogłoszenie naboru',
        url: 'https://nowoczesnagospodarka.gov.pl/aktualnosci-1-40-mln-na-cyfryzacje-polskich-firm-2-listopada-rusza-drugi-nabor-w-projekcie-dig-it-transformacja-cy/',
      },
    ],
  },
  {
    id: 'innowacje-dla-step',
    name: 'Innowacje dla STEP — bony B+R',
    operator: 'Agencja Rozwoju Aglomeracji Wrocławskiej (ARAW), FEDS',
    stateAsOf: DATA_STATE_AS_OF,
    window: 'Nabór ciągły od 19 października 2026',
    funding:
      'Bon do 200 tys. euro, 80% wartości usługi badawczej (wkład własny 20%); obszary m.in. technologie cyfrowe, w tym AI',
    needs: ['br'],
    notes: [
      'Warunek konieczny: bezpłatne doradztwo (15 h konsultacji) przed złożeniem wniosku; liczba miejsc ograniczona.',
      'Usługę B+R wykonuje uczelnia, instytut naukowy, instytut PAN lub akredytowane laboratorium.',
    ],
    documents: [
      'Potwierdzenie udziału w programie doradczym (15 h konsultacji)',
      'Opis planowanej usługi badawczej i jej wykonawcy (jednostka naukowa)',
      'Oświadczenie o statusie MŚP',
      'Dokumenty rejestrowe potwierdzające siedzibę lub oddział na Dolnym Śląsku',
    ],
    sources: [
      {
        label: 'wroclaw.pl — Innowacje dla STEP',
        url: 'https://www.wroclaw.pl/przedsiebiorczy-wroclaw/innowacje-dla-step-granty-dla-firm-dolny-slask',
      },
    ],
  },
  {
    id: 'uslugi-rozwojowe-7-4a',
    name: 'Usługi rozwojowe 7.4A FEDS (przez BUR)',
    operator: 'Dolnośląska Agencja Współpracy Gospodarczej (DAWG) i partnerzy',
    stateAsOf: DATA_STATE_AS_OF,
    window: 'Projekt 2024–2028, nabory cykliczne',
    funding: '50–70% dofinansowania, max 10 tys. zł netto na usługę, 28 tys. zł na umowę',
    needs: ['szkolenia'],
    notes: [
      'Usługa (szkolenie, doradztwo) musi być w Bazie Usług Rozwojowych (BUR); jej dostawca potrzebuje certyfikatu jakości.',
    ],
    documents: [
      'Konto i profil firmy w Bazie Usług Rozwojowych',
      'Formularz zgłoszeniowy operatora (DAWG lub partner)',
      'Oświadczenie o statusie MŚP i zestawienie pomocy de minimis',
      'Wybrane usługi z BUR (karty usług)',
    ],
    sources: [
      {
        label: 'DAWG — dotacje na usługi rozwojowe',
        url: 'https://dawg.pl/projekty/dotacje-na-uslugi-rozwojowe-dla-dolnoslskich-firm/',
      },
    ],
  },
  {
    id: 'sciezka-smart-msp',
    name: 'Ścieżka SMART MŚP — FENG.01.01-IP.02-003/26',
    operator: 'Polska Agencja Rozwoju Przedsiębiorczości (PARP)',
    stateAsOf: DATA_STATE_AS_OF,
    window: '29 października – 29 grudnia 2026',
    funding: 'Dofinansowanie projektu modułowego; moduł B+R obowiązkowy',
    needs: ['br'],
    notes: [
      'Duży, sformalizowany wniosek — realny przy konkretnym pomyśle na produkt lub proces.',
      'Prace B+R są obowiązkowym modułem projektu.',
    ],
    documents: [
      'Wniosek o dofinansowanie w systemie PARP',
      'Opis modułu B+R: hipotezy badawcze, etapy, kamienie milowe',
      'Analiza rynku i model biznesowy wdrożenia wyników',
      'Sprawozdania finansowe i oświadczenie o statusie MŚP',
    ],
    sources: [
      {
        label: 'PARP — ogłoszenie naboru (PDF)',
        url: 'https://www.parp.gov.pl/storage/grants/documents/743/ogloszenie_naboru.pdf',
      },
    ],
  },
];

export function getCall(id: string): FundingCall {
  const call = CALLS.find((c) => c.id === id);
  if (!call) throw new Error(`Unknown funding call: ${id}`);
  return call;
}
