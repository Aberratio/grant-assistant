import type { Draft } from './draft';

export type TimelineTarget = 'summary' | `section:${number}` | 'documents' | 'questions';

export interface TimelineStep {
  target: TimelineTarget;
  /** Milliseconds from the start of playback when this part appears. */
  atMs: number;
}

const BASE_MS = 250;
const MS_PER_CHAR = 1.2;
const MAX_TOTAL_MS = 4000;

/**
 * Deterministic reveal schedule for a recorded draft: no randomness, no clock.
 * Delays are proportional to text length and scaled to fit MAX_TOTAL_MS.
 */
export function buildTimeline(
  draft: Draft,
  options: { reducedMotion?: boolean } = {},
): TimelineStep[] {
  const parts: { target: TimelineTarget; chars: number }[] = [
    { target: 'summary', chars: draft.summary.length },
    ...draft.sections.map((s, i) => ({
      target: `section:${i}` as const,
      chars: s.heading.length + s.body.length,
    })),
    { target: 'documents', chars: draft.documents.reduce((n, d) => n + d.name.length, 0) },
    { target: 'questions', chars: draft.openQuestions.join('').length },
  ];

  if (options.reducedMotion) return parts.map((p) => ({ target: p.target, atMs: 0 }));

  const gaps = parts.map((p) => BASE_MS + p.chars * MS_PER_CHAR);
  const total = gaps.reduce((a, b) => a + b, 0);
  const scale = total > MAX_TOTAL_MS ? MAX_TOTAL_MS / total : 1;

  let at = 0;
  return parts.map((p, i) => {
    at += (gaps[i] ?? 0) * scale;
    return { target: p.target, atMs: Math.round(at) };
  });
}
