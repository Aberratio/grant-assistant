/**
 * Sample companies for the recorded runs. ALL OF THEM ARE FICTIONAL — names,
 * numbers and plans are invented; any resemblance to a real company is accidental.
 *
 * Each company exists in both interface languages: the facts are identical, the
 * free-text description and the "(fictional)" marker are translated. Company
 * names are proper nouns and stay Polish.
 */
import type { CompanyProfile } from '../domain/types';
import type { Lang } from '../i18n/lang';

export interface Fixture {
  id: string;
  /** Short label for the preset button. */
  label: Record<Lang, string>;
  company: Record<Lang, CompanyProfile>;
}

/** Marker appended to every sample company name. */
export const FICTIONAL_MARKER: Record<Lang, string> = {
  pl: ' (fikcyjna)',
  en: ' (fictional)',
};

type Facts = Omit<CompanyProfile, 'name' | 'description'>;

function bilingual(
  name: string,
  facts: Facts,
  description: Record<Lang, string>,
): Record<Lang, CompanyProfile> {
  const make = (lang: Lang): CompanyProfile => ({
    name: `${name}${FICTIONAL_MARKER[lang]}`,
    ...facts,
    description: description[lang],
  });
  return { pl: make('pl'), en: make('en') };
}

export const FIXTURES: readonly Fixture[] = [
  {
    id: 'kowadlo-precyzja',
    label: {
      pl: 'Tłocznia, Wielkopolska — cyfryzacja',
      en: 'Metal stamping, Greater Poland — digitalisation',
    },
    company: bilingual(
      'Kowadło Precyzja Sp. z o.o.',
      {
        industry: 'manufacturing',
        size: 'small',
        voivodeship: 'wielkopolskie',
        closedFiscalYears: 12,
        netResultPln: 410_000,
        deMinimisAvailable: 'yes',
        need: 'digital',
      },
      {
        pl: 'Tłoczymy detale stalowe dla branży AGD (ok. 45 osób, 2 zmiany). Kontrola jakości jest ręczna i wyrywkowa, reklamacje rosną. Chcemy wdrożyć wizyjną kontrolę jakości z AI na dwóch liniach i połączyć ją z ERP, żeby odrzuty i przyczyny wad trafiały do raportów automatycznie.',
        en: 'We stamp steel parts for household appliance makers (about 45 people, 2 shifts). Quality control is manual and based on spot checks, and complaints are rising. We want to roll out AI-based visual quality inspection on two lines and connect it to the ERP, so that rejects and defect causes reach the reports automatically.',
      },
    ),
  },
  {
    id: 'stolarnia-pod-jodla',
    label: {
      pl: 'Stolarnia, Dolny Śląsk — szkolenia',
      en: 'Carpentry shop, Lower Silesia — training',
    },
    company: bilingual(
      'Stolarnia Pod Jodłą',
      {
        industry: 'manufacturing',
        size: 'micro',
        voivodeship: 'dolnoslaskie',
        closedFiscalYears: 3,
        netResultPln: 60_000,
        deMinimisAvailable: 'yes',
        need: 'training',
      },
      {
        pl: 'Robimy meble na wymiar (7 osób). Wyceny i rysunki zajmują właścicielowi wieczory. Chcemy przeszkolić zespół z narzędzi AI do przygotowania wycen, opisów ofert i prostych wizualizacji.',
        en: 'We make custom furniture (7 people). Quotes and drawings take up the owner’s evenings. We want to train the team in AI tools for preparing quotes, offer descriptions and simple visualisations.',
      },
    ),
  },
  {
    id: 'sensoryka-odra',
    label: {
      pl: 'Startup IoT, Wrocław — B+R',
      en: 'IoT start-up, Wroclaw — R&D',
    },
    company: bilingual(
      'Sensoryka Odra Sp. z o.o.',
      {
        industry: 'it',
        size: 'small',
        voivodeship: 'dolnoslaskie',
        closedFiscalYears: 4,
        netResultPln: -120_000,
        deMinimisAvailable: 'unknown',
        need: 'rnd',
      },
      {
        pl: 'Budujemy czujniki drgań do maszyn CNC. Chcemy opracować model AI, który z sygnału drgań przewiduje awarię wrzeciona z wyprzedzeniem kilku dni — potrzebujemy badań z uczelnią nad danymi i walidacji na halach klientów.',
        en: 'We build vibration sensors for CNC machines. We want to develop an AI model that predicts spindle failure several days in advance from the vibration signal — we need research on the data with a university and validation on customers’ shop floors.',
      },
    ),
  },
  {
    id: 'ceramika-wartka',
    label: {
      pl: 'Ceramika, Opolskie — dane niepełne',
      en: 'Ceramics, Opole region — incomplete data',
    },
    company: bilingual(
      'Ceramika Wartka Sp. z o.o.',
      {
        industry: 'manufacturing',
        size: 'medium',
        voivodeship: 'opolskie',
        closedFiscalYears: 22,
        netResultPln: null,
        deMinimisAvailable: 'unknown',
        need: 'digital',
      },
      {
        pl: 'Produkujemy płytki ceramiczne (160 osób). Piece tunelowe psują się nieprzewidywalnie, a harmonogram produkcji układamy w arkuszu. Chcemy predykcyjnego utrzymania ruchu pieców i automatycznego harmonogramowania.',
        en: 'We make ceramic tiles (160 people). Our tunnel kilns break down unpredictably, and we plan production in a spreadsheet. We want predictive maintenance for the kilns and automated production scheduling.',
      },
    ),
  },
];

export function getFixture(id: string): Fixture {
  const fixture = FIXTURES.find((f) => f.id === id);
  if (!fixture) throw new Error(`Unknown fixture: ${id}`);
  return fixture;
}
