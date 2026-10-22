/** `npm run check:wording` — fails if the build or the docs contain a forbidden word. */
import { scan } from './wording';

const { files, hits } = scan(process.cwd());
for (const h of hits) console.error(`${h.file}:${h.line}  …${h.excerpt}…`);
if (hits.length) {
  console.error(`[wording] ${hits.length} forbidden word(s) in ${files} scanned files.`);
  process.exit(1);
}
console.log(`[wording] ok — ${files} files scanned (dist/, README.md, docs/**/*.md).`);
