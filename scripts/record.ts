/**
 * `npm run record [-- <fixtureId> ...]` — runs the live pipeline for the sample
 * companies and overwrites src/recordings/<id>.json with what Claude returned.
 * Needs ANTHROPIC_API_KEY in .env. Commit the result after reviewing the diff.
 */
import { writeFileSync } from 'node:fs';
import type { Recording } from '../src/domain/draft';
import { hashAssessmentInput } from '../src/domain/hash';
import { assess } from '../src/domain/rules';
import { FIXTURES } from '../src/fixtures/companies';
import { createGenerator } from '../server/llm';
import { loadLocalEnv } from './env';

const { hasKey } = loadLocalEnv();
if (!hasKey) {
  console.error('[record] Aborting: recording needs ANTHROPIC_API_KEY in .env.');
  process.exit(1);
}

const only = process.argv.slice(2);
const targets = only.length ? FIXTURES.filter((f) => only.includes(f.id)) : FIXTURES;
if (only.length && targets.length !== only.length) {
  console.error(`[record] Unknown fixture id. Known: ${FIXTURES.map((f) => f.id).join(', ')}`);
  process.exit(1);
}

const generate = createGenerator();
for (const fixture of targets) {
  const assessment = assess(fixture.company);
  if (!assessment.best) {
    console.warn(`[record] ${fixture.id}: no eligible call, nothing to record`);
    continue;
  }
  console.log(`[record] ${fixture.id} → ${assessment.best.callId} …`);
  const { draft, model } = await generate(fixture.company, assessment);
  const recording: Recording = {
    version: 1,
    fixtureId: fixture.id,
    inputHash: hashAssessmentInput(fixture.company, assessment.best),
    bestCallId: assessment.best.callId,
    model,
    source: 'api',
    recordedAt: new Date().toISOString().slice(0, 10),
    draft,
  };
  const path = `src/recordings/${fixture.id}.json`;
  writeFileSync(path, `${JSON.stringify(recording, null, 2)}\n`);
  console.log(`[record] wrote ${path}`);
}
