/**
 * Sample companies for the recorded demo. ALL OF THEM ARE FICTIONAL — names,
 * numbers and plans are invented; any resemblance to a real company is accidental.
 */
import type { CompanyProfile } from '../domain/types';

export interface Fixture {
  id: string;
  /** Short label for the preset button. */
  label: string;
  company: CompanyProfile;
}

export const FIXTURES: readonly Fixture[] = [
  {
    id: 'kowadlo-precyzja',
    label: 'Tłocznia, Wielkopolska — cyfryzacja',
    company: {
      name: 'Kowadło Precyzja Sp. z o.o. (fikcyjna)',
      industry: 'produkcja',
      size: 'mala',
      voivodeship: 'wielkopolskie',
      closedFiscalYears: 12,
      netResultPln: 410_000,
      deMinimisAvailable: 'tak',
      need: 'cyfryzacja',
      description:
        'Tłoczymy detale stalowe dla branży AGD (ok. 45 osób, 2 zmiany). Kontrola jakości jest ręczna i wyrywkowa, reklamacje rosną. Chcemy wdrożyć wizyjną kontrolę jakości z AI na dwóch liniach i połączyć ją z ERP, żeby odrzuty i przyczyny wad trafiały do raportów automatycznie.',
    },
  },
  {
    id: 'stolarnia-pod-jodla',
    label: 'Stolarnia, Dolny Śląsk — szkolenia',
    company: {
      name: 'Stolarnia Pod Jodłą (fikcyjna)',
      industry: 'produkcja',
      size: 'mikro',
      voivodeship: 'dolnoslaskie',
      closedFiscalYears: 3,
      netResultPln: 60_000,
      deMinimisAvailable: 'tak',
      need: 'szkolenia',
      description:
        'Robimy meble na wymiar (7 osób). Wyceny i rysunki zajmują właścicielowi wieczory. Chcemy przeszkolić zespół z narzędzi AI do przygotowania wycen, opisów ofert i prostych wizualizacji.',
    },
  },
  {
    id: 'sensoryka-odra',
    label: 'Startup IoT, Wrocław — B+R',
    company: {
      name: 'Sensoryka Odra Sp. z o.o. (fikcyjna)',
      industry: 'it',
      size: 'mala',
      voivodeship: 'dolnoslaskie',
      closedFiscalYears: 4,
      netResultPln: -120_000,
      deMinimisAvailable: 'nie_wiem',
      need: 'br',
      description:
        'Budujemy czujniki drgań do maszyn CNC. Chcemy opracować model AI, który z sygnału drgań przewiduje awarię wrzeciona z wyprzedzeniem kilku dni — potrzebujemy badań z uczelnią nad danymi i walidacji na halach klientów.',
    },
  },
  {
    id: 'ceramika-wartka',
    label: 'Ceramika, Opolskie — dane niepełne',
    company: {
      name: 'Ceramika Wartka Sp. z o.o. (fikcyjna)',
      industry: 'produkcja',
      size: 'srednia',
      voivodeship: 'opolskie',
      closedFiscalYears: 22,
      netResultPln: null,
      deMinimisAvailable: 'nie_wiem',
      need: 'cyfryzacja',
      description:
        'Produkujemy płytki ceramiczne (160 osób). Piece tunelowe psują się nieprzewidywalnie, a harmonogram produkcji układamy w arkuszu. Chcemy predykcyjnego utrzymania ruchu pieców i automatycznego harmonogramowania.',
    },
  },
];

export function getFixture(id: string): Fixture {
  const fixture = FIXTURES.find((f) => f.id === id);
  if (!fixture) throw new Error(`Unknown fixture: ${id}`);
  return fixture;
}
