import { pluralPl } from './format';
import type { Messages } from './messages';

const closedYears = (n: number) =>
  `${n} ${pluralPl(n, ['zamknięty rok obrotowy', 'zamknięte lata obrotowe', 'zamkniętych lat obrotowych'])}`;

export const pl: Messages = {
  meta: {
    title: 'Asystent wniosku dotacyjnego — kokot.it',
    description:
      'Asystent wniosku dotacyjnego: dopasowanie firmy do naborów UE według deterministycznych reguł i szkic opisu projektu przygotowany przez Claude.',
  },
  app: {
    heading: 'Asystent wniosku dotacyjnego',
    lead: 'Deterministyczne reguły sprawdzają, do których naborów UE firma pasuje i czego brakuje. Model AI dostaje wynik reguł i szkicuje opis projektu oraz listę dokumentów.',
    modeTitle: 'Tryb działania',
    mode: {
      recorded: 'Zapisany przebieg',
      live: 'Na żywo (Claude API)',
    },
    languageLabel: 'Język',
    disclaimerTitle: 'To nie jest porada prawna',
    disclaimer: (date) =>
      `Wynik ma charakter informacyjny i nie stanowi porady prawnej ani gwarancji dotacji. Reguły upraszczają warunki naborów, a dane naborów odpowiadają stanowi na ${date}. Przed złożeniem wniosku zweryfikuj regulamin u źródła.`,
    companyHeading: 'Firma',
    presetsLabel: 'Przykładowe firmy (fikcyjne):',
    matchesHeading: 'Dopasowane nabory',
    draftHeading: 'Szkic wniosku',
    footerHeading: (date) => `Dane naborów — stan na ${date}`,
    sampleData: 'Dane przykładowe · fikcyjne firmy',
  },
  form: {
    ariaLabel: 'Dane firmy',
    name: 'Nazwa firmy',
    industry: 'Branża',
    size: 'Wielkość',
    voivodeship: 'Województwo',
    closedFiscalYears: 'Zamknięte lata obrotowe',
    netResult: 'Wynik netto (zł)',
    netResultPlaceholder: 'np. 250000 lub -40000',
    netResultHint: 'Za ostatni zamknięty rok. Puste = nie wiem.',
    deMinimis: 'Wolny limit de minimis?',
    need: 'Na co potrzebne są środki?',
    description: 'Krótki opis potrzeby',
    descriptionPlaceholder: 'Co dziś nie działa i co chcecie zmienić?',
    submit: 'Sprawdź dopasowanie',
  },
  formErrors: {
    nameRequired: 'Podaj nazwę firmy.',
    nameTooLong: (max) => `Nazwa może mieć najwyżej ${max} znaków.`,
    descriptionTooLong: (max) => `Opis może mieć najwyżej ${max} znaków.`,
    industry: 'Wybierz branżę.',
    size: 'Wybierz wielkość firmy.',
    voivodeship: 'Wybierz województwo.',
    deMinimis: 'Wybierz odpowiedź.',
    need: 'Wybierz potrzebę.',
    closedFiscalYears: 'Podaj liczbę całkowitą lat (0 lub więcej).',
    netResult: 'Podaj kwotę w zł albo zostaw puste.',
  },
  labels: {
    industry: {
      manufacturing: 'Produkcja',
      manufacturing_services: 'Usługi produkcyjne',
      it: 'IT',
      retail: 'Handel',
      services: 'Inne usługi',
    },
    size: {
      micro: 'Mikro (<10)',
      small: 'Mała (10–49)',
      medium: 'Średnia (50–249)',
      large: 'Duża (250+)',
    },
    need: {
      digital: 'Wdrożenie technologii cyfrowych / AI',
      rnd: 'Prace B+R nad nowym produktem',
      training: 'Szkolenia i rozwój zespołu',
    },
    deMinimis: {
      yes: 'Tak',
      no: 'Nie (wykorzystany)',
      unknown: 'Nie wiem',
    },
    match: {
      eligible: 'Spełnia warunki',
      conditional: 'Warunkowo — do sprawdzenia',
      ineligible: 'Nie spełnia warunków',
    },
    condition: {
      met: 'spełniony',
      unmet: 'niespełniony',
      uncertain: 'do sprawdzenia',
    },
  },
  match: {
    window: 'Nabór',
    funding: 'Finansowanie',
    sources: 'Źródła: ',
    best: 'Najlepsze dopasowanie',
    stateAsOf: (date) => `stan na ${date}`,
    allConditions: (stateAsOf) => `Wszystkie warunki, uwagi i źródła (${stateAsOf})`,
    notesAndSources: (stateAsOf) => `Uwagi i źródła (${stateAsOf})`,
  },
  draft: {
    eyebrow: (callName) => `Szkic opisu projektu · ${callName}`,
    documents: 'Dokumenty do przygotowania',
    openQuestions: 'Do sprawdzenia przed wnioskiem',
    preparedOn: (date) => `szkic przygotowany ${date}`,
    template:
      'Szablon · dane różnią się od zapisanych przykładów; szkic pisany przez Claude powstaje w trybie na żywo',
    loading: 'Claude pisze szkic na podstawie wyniku reguł…',
    switchedLanguage: 'Wyślij formularz, aby przygotować szkic po polsku.',
  },
  noMatch: {
    heading: 'Brak naboru, którego warunki firma spełnia',
    body: 'Szkic opisu powstaje tylko dla naboru bez niespełnionych warunków. ',
    closest: (callName) => `Najbliżej jest „${callName}” — brakuje:`,
  },
  live: {
    noConnection: 'Brak połączenia z serwerem API. Sprawdź, czy serwer jest uruchomiony.',
    serverStatus: (status) => `Serwer zwrócił ${status}.`,
    unknownError: 'Nieznany błąd.',
    apiErrors: {
      bad_request: 'Nie udało się odczytać zapytania.',
      invalid_company: 'Nieprawidłowe dane firmy.',
      payload_too_large: 'Zapytanie jest za duże.',
      not_found: 'Nie znaleziono.',
      method_not_allowed: 'Niedozwolona metoda.',
      unsupported_media_type: 'Zapytanie musi być wysłane jako JSON.',
      model_refused: 'Model odmówił przygotowania szkicu dla tych danych.',
      model_incomplete: 'Model nie zwrócił kompletnego szkicu. Spróbuj ponownie.',
      missing_api_key:
        'Brak lub nieprawidłowy ANTHROPIC_API_KEY — skopiuj .env.example do .env i dodaj klucz.',
      rate_limited: 'Limit zapytań do API — spróbuj za chwilę.',
      generation_failed: 'Nie udało się wygenerować szkicu. Sprawdź log serwera.',
      server_error: 'Błąd serwera.',
    },
  },
  rules: {
    need: {
      digital: 'wdrożenie technologii cyfrowych',
      rnd: 'prace badawczo-rozwojowe (B+R)',
      training: 'szkolenia i usługi rozwojowe',
    },
    sme: {
      label: 'Status MŚP',
      met: 'Firma deklaruje status mikro, małego lub średniego przedsiębiorstwa.',
      unmet: 'Nabór jest tylko dla mikro, małych i średnich firm.',
    },
    region: {
      label: 'Siedziba na Dolnym Śląsku',
      met: 'Firma działa w województwie dolnośląskim.',
      unmet: 'Program finansuje tylko firmy z województwa dolnośląskiego.',
    },
    scope: {
      met: (need) => `Potrzeba firmy (${need}) mieści się w zakresie naboru.`,
      unmet: (funded, need) => `Nabór finansuje: ${funded} — a nie ${need}.`,
      rndServiceLabel: 'Usługa badawcza (B+R) od jednostki naukowej',
      developmentServiceLabel: 'Usługa rozwojowa z Bazy Usług Rozwojowych',
      rndModuleLabel: 'Projekt obejmuje obowiązkowy moduł B+R',
    },
    digit: {
      scopeLabel: 'Projekt wdraża technologie cyfrowe',
      scope: {
        digital:
          'Dig.IT finansuje gotowe i dedykowane technologie cyfrowe, w tym AI, analitykę i automatyzację.',
        training:
          'Szkolenia są kwalifikowalne tylko jako koszt dodatkowy (do 40%) przy wdrożeniu technologii cyfrowej.',
        rnd: 'Dig.IT finansuje wdrożenie technologii cyfrowych, nie prace B+R — pasuje tylko, jeśli projekt jest wdrożeniem.',
      },
      industryLabel: 'Przetwórstwo przemysłowe lub usługi produkcyjne',
      industryMet: 'Główna działalność to produkcja lub usługi produkcyjne.',
      industryUnmet:
        'Dig.IT jest dla firm, których główną działalnością jest przetwórstwo przemysłowe lub usługi produkcyjne.',
      yearsLabel: (min) => `Co najmniej ${min} zamkniętych lat obrotowych`,
      yearsMet: (n) => `Firma ma ${closedYears(n)}.`,
      yearsUnmet: (n, missing) => `Firma ma ${closedYears(n)} — brakuje ${missing}.`,
      netLabel: 'Dodatni wynik finansowy',
      netUnknown: 'Brak danych o wyniku netto za ostatni zamknięty rok — sprawdź w sprawozdaniu.',
      netPositive: 'Wynik netto za ostatni zamknięty rok jest dodatni.',
      netZero: 'Wynik netto wynosi zero — warunek wymaga wyniku dodatniego.',
      netNegative: 'Wynik netto za ostatni zamknięty rok jest ujemny.',
      deMinimisLabel: 'Wolny limit pomocy de minimis',
      deMinimisYes: 'Firma deklaruje niewykorzystany limit de minimis.',
      deMinimisNo: 'Grant jest pomocą de minimis — bez wolnego limitu nie można go otrzymać.',
      deMinimisUnknown:
        'Sprawdź pomoc de minimis z ostatnich 3 lat w SUDOP — grant musi zmieścić się w limicie.',
    },
  },
  template: {
    goal: {
      digital: 'wdrożenie technologii cyfrowych',
      rnd: 'przeprowadzenie prac badawczo-rozwojowych',
      training: 'podniesienie kompetencji zespołu',
    },
    descriptionPlaceholder: '[opisz planowany projekt w 3–5 zdaniach]',
    title: (goal, company) => `[Tytuł projektu] — ${goal} w ${company}`,
    summary: (company, goal, callName) =>
      `${company} planuje ${goal} w ramach naboru „${callName}”. To szablon do uzupełnienia — szkic pisany przez AI powstaje w trybie na żywo.`,
    problemHeading: 'Problem i stan obecny',
    problemTodo:
      '[Uzupełnij: jakie procesy dziś działają źle, ile to kosztuje (czas, braki, reklamacje), jak to mierzysz.]',
    solutionHeading: 'Rozwiązanie i zakres projektu',
    solutionBody:
      '[Uzupełnij: co dokładnie zostanie wdrożone lub zbadane, w jakich etapach, kto jest wykonawcą.]',
    resultsHeading: 'Rezultaty i wskaźniki',
    resultsBody:
      '[Uzupełnij: mierzalne efekty po projekcie — np. czas, odsetek wad, przychód — z wartością bazową i docelową.]',
    budgetHeading: 'Budżet i harmonogram',
    budgetBody: (funding, window) =>
      `Warunki finansowania: ${funding}. Termin naboru: ${window}.\n\n[Uzupełnij: koszty kwalifikowane, wkład własny, kamienie milowe.]`,
    documentNote: 'Sprawdź aktualny wzór w dokumentacji naboru.',
  },
};
