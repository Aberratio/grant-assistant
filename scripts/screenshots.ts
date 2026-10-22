/**
 * `npm run screenshots` — serves the static build with `vite preview` and
 * captures README screenshots with headless Chromium into docs/screenshots/, in
 * English and Polish (`<lang>-NN-name.png`). Run `npm run build` first. Recorded
 * runs only — no API key involved.
 */
import { mkdirSync } from 'node:fs';
import { chromium, type Page } from 'playwright';
import { preview } from 'vite';
import { LANGS, type Lang } from '../src/i18n/lang';

const OUT = 'docs/screenshots';
const PORT = Number(process.env['SCREENSHOTS_PORT'] ?? 4331);
mkdirSync(OUT, { recursive: true });

const server = await preview({ preview: { port: PORT, host: '127.0.0.1', strictPort: true } });
const base = `http://127.0.0.1:${PORT}/`;
const browser = await chromium.launch();

async function open(lang: Lang, query: string, width: number, height: number): Promise<Page> {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: 'dark',
    // The browser language is the other one on purpose: ?lang must win.
    locale: lang === 'pl' ? 'en-GB' : 'pl-PL',
  });
  await page.goto(`${base}?lang=${lang}${query}`, { waitUntil: 'networkidle' });
  await page.locator('.draft').first().waitFor();
  return page;
}

async function preset(page: Page, fixtureId: string) {
  await page.locator(`.preset[data-fixture="${fixtureId}"]`).click();
  await page.locator('.draft').first().waitFor();
}

try {
  for (const lang of LANGS) {
    const shot = (name: string) => `${OUT}/${lang}-${name}.png`;

    const desktop = await open(lang, '', 1440, 900);
    await desktop.screenshot({ path: shot('01-overview') });
    await desktop.locator('.draft-panel').screenshot({ path: shot('04-draft') });
    await desktop.locator('.site-footer').screenshot({ path: shot('07-footer') });

    await preset(desktop, 'stolarnia-pod-jodla');
    await desktop.locator('.matches').screenshot({ path: shot('02-unmet-condition') });

    await preset(desktop, 'ceramika-wartka');
    await desktop.locator('.results').screenshot({ path: shot('03-conditional-match') });
    await desktop.close();

    const embed = await open(lang, '&embed=1', 960, 900);
    await embed.screenshot({ path: shot('05-embed') });
    await embed.close();

    const mobile = await open(lang, '', 375, 812);
    await mobile.screenshot({ path: shot('06-mobile') });
    await mobile.close();
  }

  console.log(`[screenshots] written to ${OUT}/`);
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
