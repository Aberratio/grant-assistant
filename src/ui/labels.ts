import type {
  CompanySize,
  ConditionStatus,
  DeMinimis,
  Industry,
  MatchStatus,
  Need,
  Voivodeship,
} from '../domain/types';

export const INDUSTRY_LABEL: Record<Industry, string> = {
  produkcja: 'Produkcja (przetwórstwo przemysłowe)',
  uslugi_produkcyjne: 'Usługi produkcyjne',
  it: 'IT / oprogramowanie',
  handel: 'Handel',
  uslugi: 'Inne usługi',
};

export const SIZE_LABEL: Record<CompanySize, string> = {
  mikro: 'Mikro (do 9 osób)',
  mala: 'Mała (10–49 osób)',
  srednia: 'Średnia (50–249 osób)',
  duza: 'Duża (250+ osób)',
};

export const VOIVODESHIP_LABEL: Record<Voivodeship, string> = {
  dolnoslaskie: 'dolnośląskie',
  'kujawsko-pomorskie': 'kujawsko-pomorskie',
  lubelskie: 'lubelskie',
  lubuskie: 'lubuskie',
  lodzkie: 'łódzkie',
  malopolskie: 'małopolskie',
  mazowieckie: 'mazowieckie',
  opolskie: 'opolskie',
  podkarpackie: 'podkarpackie',
  podlaskie: 'podlaskie',
  pomorskie: 'pomorskie',
  slaskie: 'śląskie',
  swietokrzyskie: 'świętokrzyskie',
  'warminsko-mazurskie': 'warmińsko-mazurskie',
  wielkopolskie: 'wielkopolskie',
  zachodniopomorskie: 'zachodniopomorskie',
};

export const NEED_LABEL: Record<Need, string> = {
  cyfryzacja: 'Wdrożenie technologii cyfrowych / AI',
  br: 'Prace B+R nad nowym produktem',
  szkolenia: 'Szkolenia i rozwój zespołu',
};

export const DE_MINIMIS_LABEL: Record<DeMinimis, string> = {
  tak: 'Tak, jest wolny limit',
  nie: 'Nie, limit wykorzystany',
  nie_wiem: 'Nie wiem',
};

export const MATCH_LABEL: Record<MatchStatus, string> = {
  eligible: 'Spełnia warunki',
  conditional: 'Warunkowo — do sprawdzenia',
  ineligible: 'Nie spełnia warunków',
};

export const CONDITION_ICON: Record<ConditionStatus, { symbol: string; label: string }> = {
  met: { symbol: '✓', label: 'spełniony' },
  unmet: { symbol: '✕', label: 'niespełniony' },
  uncertain: { symbol: '?', label: 'do sprawdzenia' },
};

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
