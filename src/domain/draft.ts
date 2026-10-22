/** The shape of a project-description draft, from Claude (live) or a recording. */
import type { Lang } from '../i18n/lang';

export interface DraftSection {
  heading: string;
  body: string;
}

export interface DraftDocument {
  name: string;
  note: string;
}

export interface Draft {
  title: string;
  summary: string;
  sections: DraftSection[];
  documents: DraftDocument[];
  openQuestions: string[];
}

/**
 * How a recording was produced. 'api' = captured by `npm run record` (model is
 * the id the API reported); 'prepared' = written offline without an API call,
 * so no model produced it.
 */
export type RecordingProvenance =
  | { source: 'api'; model: string; recordedAt: string }
  | { source: 'prepared'; model: null; recordedAt: string };

/** Where the draft on screen came from. */
export type DraftOrigin =
  | ({ kind: 'recording' } & RecordingProvenance)
  | { kind: 'template' }
  | { kind: 'live'; model: string };

export type Recording = RecordingProvenance & {
  version: 1;
  fixtureId: string;
  /** Language of the draft and of the input it was produced from. */
  lang: Lang;
  /** hashAssessmentInput(company, best, lang) at recording time — detects stale recordings. */
  inputHash: string;
  bestCallId: string;
  draft: Draft;
};
