import type { Recording } from '../domain/draft';
import { hashAssessmentInput } from '../domain/hash';
import { assess } from '../domain/rules';
import type { CompanyProfile } from '../domain/types';
import kowadlo from './kowadlo-precyzja.json';
import stolarnia from './stolarnia-pod-jodla.json';
import sensoryka from './sensoryka-odra.json';
import ceramika from './ceramika-wartka.json';

// JSON imports widen literal types; recordings.test.ts validates the shape.
export const RECORDINGS: readonly Recording[] = [kowadlo, stolarnia, sensoryka, ceramika].map(
  (r) => r as Recording,
);

/** The recording for exactly this input and rule result, or null. Pure lookup. */
export function findRecording(company: CompanyProfile): Recording | null {
  const hash = hashAssessmentInput(company, assess(company).best);
  return RECORDINGS.find((r) => r.inputHash === hash) ?? null;
}
