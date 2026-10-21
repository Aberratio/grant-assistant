import type { Draft } from '../src/domain/draft';
import { RECORDINGS } from '../src/recordings';

export function getRecordingDraft(fixtureId: string): Draft {
  const recording = RECORDINGS.find((r) => r.fixtureId === fixtureId);
  if (!recording) throw new Error(`No recording for ${fixtureId}`);
  return recording.draft;
}
