/**
 * Region (voivodeship) names. Polish administrative names are proper nouns; the
 * English labels use the common English names.
 */
import type { Voivodeship } from '../domain/types';
import type { Lang } from '../i18n/lang';

export const VOIVODESHIP_LABEL: Record<Lang, Record<Voivodeship, string>> = {
  pl: {
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
  },
  en: {
    dolnoslaskie: 'Lower Silesian',
    'kujawsko-pomorskie': 'Kuyavian-Pomeranian',
    lubelskie: 'Lublin',
    lubuskie: 'Lubusz',
    lodzkie: 'Łódź',
    malopolskie: 'Lesser Poland',
    mazowieckie: 'Masovian',
    opolskie: 'Opole',
    podkarpackie: 'Subcarpathian',
    podlaskie: 'Podlaskie',
    pomorskie: 'Pomeranian',
    slaskie: 'Silesian',
    swietokrzyskie: 'Holy Cross',
    'warminsko-mazurskie': 'Warmian-Masurian',
    wielkopolskie: 'Greater Poland',
    zachodniopomorskie: 'West Pomeranian',
  },
};
