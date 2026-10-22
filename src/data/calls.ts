/**
 * Funding calls known to the assistant. Facts were checked on the linked official
 * pages on 2026-10-21. Always verify the call regulations at the source.
 *
 * Each call carries its text in Polish and English. Programme names are proper
 * nouns and stay Polish in both languages (with an English descriptor where it
 * helps); everything else is translated.
 */
import type { Lang } from '../i18n/lang';
import type { Need } from '../domain/types';

export interface Source {
  label: string;
  url: string;
}

/** A funding call as shown in one language. */
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

interface CallText {
  name: string;
  operator: string;
  window: string;
  funding: string;
  notes: readonly string[];
  documents: readonly string[];
  /** Source link labels, in the order of `urls`. */
  sourceLabels: readonly string[];
}

interface CallData {
  id: string;
  stateAsOf: string;
  needs: readonly Need[];
  urls: readonly string[];
  text: Record<Lang, CallText>;
}

export const DATA_STATE_AS_OF = '2026-10-21';

/**
 * Order matters: it is the curated tie-break when two calls have the same
 * eligibility status and the same number of open questions (see rank()).
 * Smaller, simpler instruments come before large formal ones.
 */
const CALL_DATA: readonly CallData[] = [
  {
    id: 'digit-2-2026',
    stateAsOf: DATA_STATE_AS_OF,
    needs: ['digital'],
    urls: [
      'https://digit.arp.pl/eventy/nabory/digit-konkurs-22026/',
      'https://nowoczesnagospodarka.gov.pl/aktualnosci-1-40-mln-na-cyfryzacje-polskich-firm-2-listopada-rusza-drugi-nabor-w-projekcie-dig-it-transformacja-cy/',
    ],
    text: {
      pl: {
        name: 'Dig.IT Transformacja cyfrowa — konkurs 2/2026',
        operator: 'Agencja Rozwoju Przemysłu (ARP)',
        window: '2–30 listopada 2026 (może zostać skrócony przy 200% alokacji, min. 10 dni)',
        funding:
          'Grant 150–850 tys. zł, do 50% kosztów kwalifikowanych, pomoc de minimis, refundacja po projekcie; grant nie więcej niż 30% średnich rocznych przychodów netto z 3 lat',
        notes: [
          'Projekt nie może rozpocząć się przed złożeniem wniosku.',
          'Wniosek wymaga co najmniej 3 ofert cenowych od wykonawców — zbierz je przed naborem.',
          'Szkolenia, środki trwałe i materiały tylko jako koszty dodatkowe (do 40% kosztów kwalifikowanych).',
          'Warunek dodatniego wyniku finansowego wynika z regulaminu konkursu, a nie z ogłoszenia naboru — potwierdź go w aktualnej wersji regulaminu.',
        ],
        documents: [
          'Wniosek o powierzenie grantu (zał. 2)',
          'Oświadczenie dot. sprawozdań finansowych (zał. 4) oraz sprawozdania za 5 zamkniętych lat obrotowych',
          'Upoważnienie do weryfikacji w BIG InfoMonitor i BIK (zał. 5)',
          'Oświadczenie dot. dokumentacji papierowej (zał. 6)',
          'Co najmniej 3 oferty cenowe na planowane technologie cyfrowe',
          'Zestawienie pomocy de minimis otrzymanej w ostatnich 3 latach',
        ],
        sourceLabels: ['ARP — konkurs 2/2026', 'nowoczesnagospodarka.gov.pl — ogłoszenie naboru'],
      },
      en: {
        name: 'Dig.IT Transformacja cyfrowa (digital transformation) — call 2/2026',
        operator: 'Industrial Development Agency (ARP)',
        window:
          '2–30 November 2026 (may close early once applications reach 200% of the allocation, after at least 10 days)',
        funding:
          'Grant of PLN 150–850k, up to 50% of eligible costs, de minimis aid, reimbursed after the project; the grant may not exceed 30% of average annual net revenue over 3 years',
        notes: [
          'The project may not start before the application is submitted.',
          'The application requires at least 3 price quotes from contractors — collect them before the call opens.',
          'Training, fixed assets and materials only as additional costs (up to 40% of eligible costs).',
          'The positive net result condition comes from the call regulations rather than the call announcement — confirm it in the current version of the regulations.',
        ],
        documents: [
          'Grant application (annex 2)',
          'Statement on financial statements (annex 4) and the statements for 5 closed fiscal years',
          'Authorisation for checks in BIG InfoMonitor and BIK (annex 5)',
          'Statement on paper documentation (annex 6)',
          'At least 3 price quotes for the planned digital technology',
          'Summary of de minimis aid received in the last 3 years',
        ],
        sourceLabels: ['ARP — call 2/2026', 'nowoczesnagospodarka.gov.pl — call announcement'],
      },
    },
  },
  {
    id: 'innowacje-dla-step',
    stateAsOf: DATA_STATE_AS_OF,
    needs: ['rnd'],
    urls: [
      'https://www.wroclaw.pl/przedsiebiorczy-wroclaw/innowacje-dla-step-granty-dla-firm-dolny-slask',
    ],
    text: {
      pl: {
        name: 'Innowacje dla STEP — bony B+R',
        operator: 'Agencja Rozwoju Aglomeracji Wrocławskiej (ARAW), FEDS',
        window: 'Nabór ciągły od 19 października 2026',
        funding:
          'Bon do 200 tys. euro, 80% wartości usługi badawczej (wkład własny 20%); obszary m.in. technologie cyfrowe, w tym AI',
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
        sourceLabels: ['wroclaw.pl — Innowacje dla STEP'],
      },
      en: {
        name: 'Innowacje dla STEP — R&D vouchers',
        operator: 'Wroclaw Agglomeration Development Agency (ARAW), FEDS',
        window: 'Rolling call from 19 October 2026',
        funding:
          'Voucher of up to EUR 200k, 80% of the research service value (20% own contribution); areas include digital technology and AI',
        notes: [
          'Mandatory: free advisory programme (15 hours of consultations) before applying; places are limited.',
          'The R&D service is delivered by a university, research institute, Polish Academy of Sciences institute or accredited laboratory.',
        ],
        documents: [
          'Confirmation of the advisory programme (15 hours of consultations)',
          'Description of the planned research service and its provider (research organisation)',
          'SME status declaration',
          'Registration documents confirming a seat or branch in Lower Silesia',
        ],
        sourceLabels: ['wroclaw.pl — Innowacje dla STEP'],
      },
    },
  },
  {
    id: 'uslugi-rozwojowe-7-4a',
    stateAsOf: DATA_STATE_AS_OF,
    needs: ['training'],
    urls: ['https://dawg.pl/projekty/dotacje-na-uslugi-rozwojowe-dla-dolnoslskich-firm/'],
    text: {
      pl: {
        name: 'Usługi rozwojowe 7.4A FEDS (przez BUR)',
        operator: 'Dolnośląska Agencja Współpracy Gospodarczej (DAWG) i partnerzy',
        window: 'Projekt 2024–2028, nabory cykliczne',
        funding: '50–70% dofinansowania, max 10 tys. zł netto na usługę, 28 tys. zł na umowę',
        notes: [
          'Usługa (szkolenie, doradztwo) musi być w Bazie Usług Rozwojowych (BUR); jej dostawca potrzebuje certyfikatu jakości.',
        ],
        documents: [
          'Konto i profil firmy w Bazie Usług Rozwojowych',
          'Formularz zgłoszeniowy operatora (DAWG lub partner)',
          'Oświadczenie o statusie MŚP i zestawienie pomocy de minimis',
          'Wybrane usługi z BUR (karty usług)',
        ],
        sourceLabels: ['DAWG — dotacje na usługi rozwojowe'],
      },
      en: {
        name: 'Usługi rozwojowe 7.4A FEDS — development services (via BUR)',
        operator: 'Lower Silesian Economic Cooperation Agency (DAWG) and partners',
        window: 'Project 2024–2028, recurring intakes',
        funding: '50–70% co-financing, up to PLN 10k net per service and PLN 28k per agreement',
        notes: [
          'The service (training, consulting) must be listed in the Development Services Database (BUR); its provider needs a quality certificate.',
        ],
        documents: [
          'Company account and profile in the Development Services Database (BUR)',
          "Operator's application form (DAWG or a partner)",
          'SME status declaration and summary of de minimis aid',
          'Selected BUR services (service cards)',
        ],
        sourceLabels: ['DAWG — development services funding'],
      },
    },
  },
  {
    id: 'sciezka-smart-msp',
    stateAsOf: DATA_STATE_AS_OF,
    needs: ['rnd'],
    urls: ['https://www.parp.gov.pl/storage/grants/documents/743/ogloszenie_naboru.pdf'],
    text: {
      pl: {
        name: 'Ścieżka SMART MŚP — FENG.01.01-IP.02-003/26',
        operator: 'Polska Agencja Rozwoju Przedsiębiorczości (PARP)',
        window: '29 października – 29 grudnia 2026',
        funding: 'Dofinansowanie projektu modułowego; moduł B+R obowiązkowy',
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
        sourceLabels: ['PARP — ogłoszenie naboru (PDF)'],
      },
      en: {
        name: 'Ścieżka SMART MŚP (SME SMART path) — FENG.01.01-IP.02-003/26',
        operator: 'Polish Agency for Enterprise Development (PARP)',
        window: '29 October – 29 December 2026',
        funding: 'Co-financing of a modular project; the R&D module is mandatory',
        notes: [
          'A large, formal application — realistic with a concrete product or process idea.',
          'R&D work is a mandatory module of the project.',
        ],
        documents: [
          'Funding application in the PARP system',
          'R&D module description: research hypotheses, stages, milestones',
          'Market analysis and business model for commercialising the results',
          'Financial statements and SME status declaration',
        ],
        sourceLabels: ['PARP — call announcement (PDF)'],
      },
    },
  },
];

/** Call ids in the curated order. */
export const CALL_IDS: readonly string[] = CALL_DATA.map((c) => c.id);

function resolve(data: CallData, lang: Lang): FundingCall {
  const text = data.text[lang];
  return {
    id: data.id,
    name: text.name,
    operator: text.operator,
    stateAsOf: data.stateAsOf,
    window: text.window,
    funding: text.funding,
    needs: data.needs,
    notes: text.notes,
    documents: text.documents,
    sources: data.urls.map((url, i) => ({ label: text.sourceLabels[i] ?? url, url })),
  };
}

export function listCalls(lang: Lang): FundingCall[] {
  return CALL_DATA.map((c) => resolve(c, lang));
}

export function getCall(id: string, lang: Lang): FundingCall {
  const data = CALL_DATA.find((c) => c.id === id);
  if (!data) throw new Error(`Unknown funding call: ${id}`);
  return resolve(data, lang);
}
