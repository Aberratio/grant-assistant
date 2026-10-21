/**
 * Zod schema of a draft. Used by the live server (structured output from
 * Claude) and by tests that validate recordings. The browser bundle only imports
 * the plain types from ./draft, so zod stays out of the static build.
 */
import { z } from 'zod';
import type { Draft } from './draft';

export const DraftSchema = z.object({
  title: z.string().describe('Working title of the project, in Polish.'),
  summary: z.string().describe('2–3 sentence summary of the project, in Polish.'),
  sections: z
    .array(
      z.object({
        heading: z.string(),
        body: z.string(),
      }),
    )
    .describe(
      'Project description sections in Polish: problem, solution and scope, expected results, budget and schedule outline.',
    ),
  documents: z
    .array(
      z.object({
        name: z.string(),
        note: z.string().describe('What to prepare and why, specific to this company.'),
      }),
    )
    .describe('Documents to prepare for this call, in Polish.'),
  openQuestions: z
    .array(z.string())
    .describe('Things to verify before applying (uncertain conditions, data gaps), in Polish.'),
});

// Compile-time guard: the schema and the hand-written type must agree.
type SchemaDraft = z.infer<typeof DraftSchema>;
export const draftTypesAgree: [SchemaDraft] extends [Draft]
  ? [Draft] extends [SchemaDraft]
    ? true
    : never
  : never = true;
