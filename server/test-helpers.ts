import type { Draft } from '../src/domain/draft';
import type { Lang } from '../src/i18n/lang';
import { RECORDINGS } from '../src/recordings';

export function getRecordingDraft(fixtureId: string, lang: Lang): Draft {
  const recording = RECORDINGS.find((r) => r.fixtureId === fixtureId && r.lang === lang);
  if (!recording) throw new Error(`No ${lang} recording for ${fixtureId}`);
  return recording.draft;
}
