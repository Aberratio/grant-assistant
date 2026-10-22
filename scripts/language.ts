/**
 * Language guard: the repository is written in English. Polish text is allowed
 * only where it is product content or data:
 *   - src/i18n/pl.ts       Polish interface dictionary,
 *   - src/data/            funding-call data (Polish programme and agency names, Polish call text),
 *   - src/fixtures/        sample companies (Polish names and descriptions),
 *   - src/recordings/      recorded drafts (Polish drafts; English drafts quote Polish names).
 * Everywhere else (code, comments, tests, scripts, README, docs, config) a Polish
 * letter fails the check, except inside the proper names listed below.
 *
 * Polish letters are written as \u escapes so this file passes its own check.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

/** Letters that exist in Polish but not in English. */
export const POLISH_LETTERS =
  /[\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017a\u017c\u0104\u0106\u0118\u0141\u0143\u00d3\u015a\u0179\u017b]/;

export const ALLOWED_PATHS = ['src/i18n/pl.ts', 'src/data/', 'src/fixtures/', 'src/recordings/'];

/**
 * Proper names that keep their Polish spelling in English prose (README, docs):
 * official programme names.
 */
export const ALLOWED_NAMES = ['\u015acie\u017cka SMART M\u015aP', 'Us\u0142ugi rozwojowe'];

/** Binary or generated files that are not prose. */
const SKIPPED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.woff',
  '.woff2',
  '.pdf',
]);
const SKIPPED_FILES = new Set(['package-lock.json']);

export interface LanguageHit {
  file: string;
  line: number;
  excerpt: string;
}

export function isAllowedPath(file: string): boolean {
  return ALLOWED_PATHS.some((p) => (p.endsWith('/') ? file.startsWith(p) : file === p));
}

export function isChecked(file: string): boolean {
  const base = file.split('/').pop() ?? file;
  return (
    !SKIPPED_FILES.has(base) &&
    !SKIPPED_EXTENSIONS.has(extname(file).toLowerCase()) &&
    !isAllowedPath(file)
  );
}

export function findPolish(file: string, text: string): LanguageHit[] {
  const hits: LanguageHit[] = [];
  text.split(/\r?\n/).forEach((content, i) => {
    const stripped = ALLOWED_NAMES.reduce((line, name) => line.split(name).join(''), content);
    const match = POLISH_LETTERS.exec(stripped);
    if (match) {
      const start = Math.max(0, match.index - 30);
      hits.push({ file, line: i + 1, excerpt: stripped.slice(start, match.index + 30).trim() });
    }
  });
  return hits;
}

/** Tracked and new (not ignored) files, as repository-relative paths with `/`. */
export function repositoryFiles(root: string): string[] {
  const out = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );
  return [...new Set(out.split('\0').filter(Boolean))];
}

export function scanRepository(root: string): { files: number; hits: LanguageHit[] } {
  const files = repositoryFiles(root).filter(isChecked);
  const hits = files.flatMap((f) => {
    let text: string;
    try {
      text = readFileSync(`${root}/${f}`, 'utf8');
    } catch {
      return []; // deleted in the working tree but still in the index
    }
    return findPolish(f, text);
  });
  return { files: files.length, hits };
}
