/**
 * Wording guard: a few words must never reach a reader of the shipped app or the
 * documentation. Scans text files of the static build (`dist/`), README.md and
 * docs/**\/*.md. Binary assets (fonts, images) are skipped.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';

/**
 * Forbidden word in English and every Polish inflection of it (demo, dema, demu,
 * demem, demie, dem, demach, demom, demami). Unrelated words that merely contain
 * the letters (demographic, democracy, demand, academic, pandemia) are allowed.
 */
export const FORBIDDEN = /demo(?!graph|crat|cracy)|\bdem(?:a|u|em|ie|ach|om|ami)?\b/gi;

export const TEXT_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.svg', '.md', '.txt']);

export interface Hit {
  file: string;
  line: number;
  excerpt: string;
}

export function findHits(file: string, text: string): Hit[] {
  const hits: Hit[] = [];
  text.split(/\r?\n/).forEach((content, i) => {
    for (const m of content.matchAll(FORBIDDEN)) {
      const start = Math.max(0, m.index - 30);
      hits.push({ file, line: i + 1, excerpt: content.slice(start, m.index + 34).trim() });
    }
  });
  return hits;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

export function scan(root: string): { files: number; hits: Hit[] } {
  const exists = (p: string) => {
    try {
      statSync(p);
      return true;
    } catch {
      return false;
    }
  };
  const dist = join(root, 'dist');
  const docs = join(root, 'docs');
  if (!exists(dist)) throw new Error('dist/ not found — run `npm run build` first.');
  const files = [
    ...walk(dist).filter((f) => TEXT_EXTENSIONS.has(extname(f))),
    join(root, 'README.md'),
    ...(exists(docs) ? walk(docs).filter((f) => extname(f) === '.md') : []),
  ];
  const hits = files.flatMap((f) =>
    findHits(relative(root, f).split(sep).join('/'), readFileSync(f, 'utf8')),
  );
  return { files: files.length, hits };
}
