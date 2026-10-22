/**
 * `npm run screenshots` — serves the static build with `vite preview` and
 * captures README screenshots with headless Chromium into docs/screenshots/.
 * Run `npm run build` first. Recorded runs only — no API key involved.
 */
import { mkdirSync } from 'node:fs';
import { chromium, type Page } from 'playwright';
import { preview } from 'vite';

const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

const server = await preview({ preview: { port: 4179, host: '127.0.0.1', strictPort: true } });
const base = 'http://127.0.0.1:4179/';
const browser = await chromium.launch();

async function open(path: string, width: number, height: number): Promise<Page> {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    colorScheme: 'dark',
  });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.locator('.draft').first().waitFor();
  return page;
}

async function preset(page: Page, label: RegExp) {
  await page.getByRole('button', { name: label }).click();
  await page.locator('.draft').first().waitFor();
}

try {
  const desktop = await open('', 1440, 900);
  await desktop.screenshot({ path: `${OUT}/01-overview.png` });
  await desktop.locator('.draft-panel').screenshot({ path: `${OUT}/04-draft.png` });
  await desktop.locator('.site-footer').screenshot({ path: `${OUT}/07-footer.png` });

  await preset(desktop, /Stolarnia/);
  await desktop.locator('.matches').screenshot({ path: `${OUT}/02-unmet-condition.png` });

  await preset(desktop, /Ceramika/);
  await desktop.locator('.results').screenshot({ path: `${OUT}/03-conditional-match.png` });
  await desktop.close();

  const embed = await open('?embed=1', 960, 900);
  await embed.screenshot({ path: `${OUT}/05-embed.png` });
  await embed.close();

  const mobile = await open('', 375, 812);
  await mobile.screenshot({ path: `${OUT}/06-mobile.png` });
  await mobile.screenshot({ path: `${OUT}/06-mobile-full.png`, fullPage: true });
  await mobile.close();

  console.log(`[screenshots] written to ${OUT}/`);
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
