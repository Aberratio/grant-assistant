/** The shape of a project-description draft, from Claude (live) or a recording. */
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

/** Where the draft on screen came from. */
export type DraftOrigin =
  | { kind: 'recording'; model: string; source: 'prepared' | 'api'; recordedAt: string }
  | { kind: 'template' }
  | { kind: 'live'; model: string };

export interface Recording {
  version: 1;
  fixtureId: string;
  /** hashAssessmentInput(company, best) at recording time — detects stale recordings. */
  inputHash: string;
  bestCallId: string;
  model: string;
  /** 'prepared' = written offline without an API call; 'api' = captured by `npm run record`. */
  source: 'prepared' | 'api';
  recordedAt: string;
  draft: Draft;
}
