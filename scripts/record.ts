/**
 * `npm run record [-- <fixtureId> ...] [-- --lang pl|en]` — runs the live pipeline
 * for the sample companies in each interface language and overwrites
 * src/recordings/<lang>/<id>.json with what Claude returned. Needs
 * ANTHROPIC_API_KEY in .env. Commit the result after reviewing the diff.
 */
import { writeFileSync } from 'node:fs';
import type { Recording } from '../src/domain/draft';
import { hashAssessmentInput } from '../src/domain/hash';
import { assess } from '../src/domain/rules';
import { FIXTURES } from '../src/fixtures/companies';
import { isLang, LANGS, type Lang } from '../src/i18n/lang';
import { createGenerator } from '../server/llm';
import { loadLocalEnv } from './env';

const { hasKey } = loadLocalEnv();
if (!hasKey) {
  console.error('[record] Aborting: recording needs ANTHROPIC_API_KEY in .env.');
  process.exit(1);
}

const args = process.argv.slice(2);
const langFlag = args.indexOf('--lang');
const langArg = langFlag >= 0 ? args[langFlag + 1] : undefined;
if (langFlag >= 0 && !isLang(langArg)) {
  console.error(`[record] --lang must be one of: ${LANGS.join(', ')}`);
  process.exit(1);
}
const langs: readonly Lang[] = isLang(langArg) ? [langArg] : LANGS;
const only = args.filter((a, i) => a !== '--lang' && i !== langFlag + 1);
const targets = only.length ? FIXTURES.filter((f) => only.includes(f.id)) : FIXTURES;
if (only.length && targets.length !== only.length) {
  console.error(`[record] Unknown fixture id. Known: ${FIXTURES.map((f) => f.id).join(', ')}`);
  process.exit(1);
}

const generate = createGenerator();
for (const lang of langs) {
  for (const fixture of targets) {
    const company = fixture.company[lang];
    const assessment = assess(company, lang);
    if (!assessment.best) {
      console.warn(`[record] ${lang}/${fixture.id}: no eligible call, nothing to record`);
      continue;
    }
    console.log(`[record] ${lang}/${fixture.id} → ${assessment.best.callId} …`);
    const { draft, model } = await generate(company, assessment, lang);
    const recording: Recording = {
      version: 1,
      fixtureId: fixture.id,
      lang,
      inputHash: hashAssessmentInput(company, assessment.best, lang),
      bestCallId: assessment.best.callId,
      model,
      source: 'api',
      recordedAt: new Date().toISOString().slice(0, 10),
      draft,
    };
    const path = `src/recordings/${lang}/${fixture.id}.json`;
    writeFileSync(path, `${JSON.stringify(recording, null, 2)}\n`);
    console.log(`[record] wrote ${path}`);
  }
}
