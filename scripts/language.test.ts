import { describe, expect, it } from 'vitest';
import { findPolish, isChecked, scanRepository } from './language';

// Polish samples are built from \u escapes so this file passes the guard itself.
const ZOLC = '\u017c\u00f3\u0142\u0107';
const SMART = '\u015acie\u017cka SMART M\u015aP';

describe('language guard', () => {
  it('flags a line with Polish letters and reports file, line and excerpt', () => {
    expect(findPolish('src/a.ts', `ok\nconst label = '${ZOLC}';`)).toEqual([
      { file: 'src/a.ts', line: 2, excerpt: `const label = '${ZOLC}';` },
    ]);
  });

  it.each(['\u0141\u00f3d\u017a', 'Na \u017cywo', 'GRANT \u015aWI\u0118TY'])('flags %s', (text) => {
    expect(findPolish('f', text)).toHaveLength(1);
  });

  it('allows official programme names inside English prose', () => {
    expect(findPolish('README.md', `| ${SMART} | PARP |`)).toEqual([]);
    expect(findPolish('README.md', `${SMART} and ${ZOLC}`)).toHaveLength(1);
  });

  it('does not flag Polish words written without diacritics (reviewed by hand)', () => {
    expect(findPolish('f', 'dolnoslaskie')).toEqual([]);
  });

  it.each([
    ['src/ui/app.ts', true],
    ['README.md', true],
    ['docs/architecture.md', true],
    ['src/i18n/en.ts', true],
    ['src/i18n/pl.ts', false],
    ['src/data/calls.ts', false],
    ['src/fixtures/companies.ts', false],
    ['src/recordings/en/kowadlo-precyzja.json', false],
    ['docs/screenshots/en-desktop.png', false],
    ['src/assets/fonts/a.woff2', false],
    ['package-lock.json', false],
  ])('%s is checked: %s', (file, checked) => {
    expect(isChecked(file)).toBe(checked);
  });

  it('the repository itself passes', () => {
    expect(scanRepository(process.cwd()).hits).toEqual([]);
  });
});
