import type { Recording } from '../domain/draft';
import { hashAssessmentInput } from '../domain/hash';
import { assess } from '../domain/rules';
import type { CompanyProfile } from '../domain/types';
import type { Lang } from '../i18n/lang';
import enCeramika from './en/ceramika-wartka.json';
import enKowadlo from './en/kowadlo-precyzja.json';
import enSensoryka from './en/sensoryka-odra.json';
import enStolarnia from './en/stolarnia-pod-jodla.json';
import plCeramika from './pl/ceramika-wartka.json';
import plKowadlo from './pl/kowadlo-precyzja.json';
import plSensoryka from './pl/sensoryka-odra.json';
import plStolarnia from './pl/stolarnia-pod-jodla.json';

// JSON imports widen literal types; recordings.test.ts validates the shape.
export const RECORDINGS: readonly Recording[] = [
  enKowadlo,
  enStolarnia,
  enSensoryka,
  enCeramika,
  plKowadlo,
  plStolarnia,
  plSensoryka,
  plCeramika,
].map((r) => r as Recording);

/** The recording for exactly this input, language and rule result, or null. Pure lookup. */
export function findRecording(company: CompanyProfile, lang: Lang): Recording | null {
  const hash = hashAssessmentInput(company, assess(company, lang).best, lang);
  return RECORDINGS.find((r) => r.lang === lang && r.inputHash === hash) ?? null;
}
