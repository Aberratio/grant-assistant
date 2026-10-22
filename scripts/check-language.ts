/** `npm run check:language` — fails if Polish text appears outside the allowed paths. */
import { ALLOWED_PATHS, scanRepository } from './language';

const { files, hits } = scanRepository(process.cwd());
for (const h of hits) console.error(`${h.file}:${h.line}  …${h.excerpt}…`);
if (hits.length) {
  console.error(
    `[language] ${hits.length} line(s) with Polish letters in ${files} checked files. ` +
      `Move interface text to src/i18n/ and keep data in ${ALLOWED_PATHS.join(', ')}.`,
  );
  process.exit(1);
}
console.log(`[language] ok — ${files} files checked; Polish only in ${ALLOWED_PATHS.join(', ')}.`);
