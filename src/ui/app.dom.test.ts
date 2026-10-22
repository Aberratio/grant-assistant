// @vitest-environment jsdom
/**
 * The UI flow end to end in a DOM: form → rules → ranked matches → draft, in both
 * interface languages. Rules, recordings and the template run for real; only
 * `fetch` is stubbed for the live mode (no network, no key).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getFixture } from '../fixtures/companies';
import { messages } from '../i18n/messages';
import { RECORDINGS } from '../recordings';
import { mountApp } from './app';

let root: HTMLElement;

beforeEach(() => {
  history.replaceState(null, '', '/');
  document.head.innerHTML = '<meta name="description" content="" />';
  document.body.innerHTML = '<div id="app"></div>';
  root = document.querySelector<HTMLElement>('#app')!;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const en = messages('en');
const pl = messages('pl');
const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
const $$ = (sel: string) => [...root.querySelectorAll<HTMLElement>(sel)];
const text = (sel: string) => $(sel)?.textContent ?? '';
const recordingOf = (fixtureId: string, lang: 'en' | 'pl') =>
  RECORDINGS.find((r) => r.fixtureId === fixtureId && r.lang === lang)!;

function setField(name: string, value: string) {
  const el = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function submit() {
  $<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
}

function clickPreset(fixtureId: string) {
  $(`.preset[data-fixture="${fixtureId}"]`)!.click();
}

function switchTo(lang: 'en' | 'pl') {
  $(`.lang-switch [data-lang="${lang}"]`)!.click();
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('recorded mode (English)', () => {
  beforeEach(() => mountApp(root, { mode: 'recorded', embed: false, lang: 'en' }));

  it('shows a prominent legal notice with the data date and a mode badge', () => {
    expect(text('.disclaimer-title')).toBe(en.app.disclaimerTitle);
    expect(text('.disclaimer')).toContain('do not guarantee funding');
    expect(text('.disclaimer')).toContain('21 October 2026');
    expect($('.disclaimer')!.getAttribute('role')).toBe('note');
    expect(text('.mode')).toBe('Recorded run');
  });

  it('sets the document language, title and description', () => {
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe(en.meta.title);
    expect(document.querySelector('meta[name="description"]')!.getAttribute('content')).toBe(
      en.meta.description,
    );
  });

  it('lists every funding call with source links in the footer', () => {
    const links = $$('.site-footer a').map((a) => a.getAttribute('href'));
    expect(links).toContain('https://digit.arp.pl/eventy/nabory/digit-konkurs-22026/');
    expect(links.length).toBeGreaterThanOrEqual(4);
  });

  it('marks the sample data and credits kokot.it in the footer', () => {
    expect(text('.site-footer .sample-data')).toBe(en.app.sampleData);
    expect(text('.site-footer .byline')).toBe('© 2026 kokot.it');
    expect($('.site-footer .byline a')!.getAttribute('href')).toBe('https://kokot.it');
  });

  it('replays the first sample company on load: Dig.IT first, recorded draft and documents', () => {
    const recording = recordingOf('kowadlo-precyzja', 'en');
    expect(text('.match--best h3')).toContain('Dig.IT');
    expect(text('.origin')).toContain('Recorded run');
    expect(text('.draft-title')).toBe(recording.draft.title);
    expect($$('.documents li')).toHaveLength(recording.draft.documents.length);
  });

  it('shows the unmet five-year condition for the young carpentry shop', () => {
    clickPreset('stolarnia-pod-jodla');
    const digit = $$('.match').find((m) => m.textContent?.includes('Dig.IT'))!;
    expect(digit.className).toContain('match--ineligible');
    expect(digit.querySelector('.condition--unmet')?.textContent).toContain('2 short');
    expect(text('.match--best h3')).toContain('7.4A');
  });

  it('falls back to a labelled template when the input differs from the recordings', () => {
    setField('closedFiscalYears', '13');
    submit();
    expect(text('.origin')).toBe(en.draft.template);
    expect($$('.preset').every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
  });

  it('explains what is missing when no call matches', () => {
    setField('size', 'large');
    submit();
    expect(text('.draft--empty h3')).toBe(en.noMatch.heading);
    expect(text('.draft--empty')).toContain('SME status');
  });

  it('shows field errors instead of running on invalid input', () => {
    const before = text('.draft-title');
    setField('name', '  ');
    submit();
    expect($('#f-name')!.getAttribute('aria-invalid')).toBe('true');
    expect(text('#f-name-error')).toBe(en.formErrors.nameRequired);
    expect(text('.draft-title')).toBe(before);
  });

  it('renders model and user text as text, never as markup', () => {
    setField('name', '<img src=x onerror=alert(1)>');
    submit();
    expect(root.querySelector('[onerror]')).toBeNull();
    expect([...root.querySelectorAll('img')].every((i) => i.alt === 'kokot.it')).toBe(true);
    expect(text('.draft-title')).toContain('<img');
  });
});

describe('recorded mode (Polish)', () => {
  beforeEach(() => mountApp(root, { mode: 'recorded', embed: false, lang: 'pl' }));

  it('renders the interface, the rules and the recorded draft in Polish', () => {
    expect(document.documentElement.lang).toBe('pl');
    expect(text('h1')).toBe(pl.app.heading);
    expect(text('.disclaimer-title')).toBe(pl.app.disclaimerTitle);
    expect(text('.disclaimer')).toContain('21.10.2026');
    expect(text('.mode')).toBe(pl.app.mode.recorded);
    expect(text('.draft-title')).toBe(recordingOf('kowadlo-precyzja', 'pl').draft.title);
    expect(text('.match--best .condition-label')).toBe(pl.rules.sme.label);
    expect($<HTMLInputElement>('[name="name"]')!.value).toBe(
      getFixture('kowadlo-precyzja').company.pl.name,
    );
  });

  it('shows Polish validation messages', () => {
    setField('name', '  ');
    submit();
    expect(text('#f-name-error')).toBe(pl.formErrors.nameRequired);
  });
});

describe('language switch', () => {
  it('offers both languages and marks the current one', () => {
    mountApp(root, { mode: 'recorded', embed: false, lang: 'en' });
    const buttons = $$('.lang-switch button');
    expect(buttons.map((b) => b.textContent)).toEqual(['EN', 'PL']);
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
    expect($('.lang-switch')!.getAttribute('aria-label')).toBe(en.app.languageLabel);
  });

  it('re-renders everything in the other language and replays the same sample company', () => {
    mountApp(root, { mode: 'recorded', embed: false, lang: 'en' });
    clickPreset('sensoryka-odra');
    switchTo('pl');

    expect(document.documentElement.lang).toBe('pl');
    expect(location.search).toBe('?lang=pl');
    expect(text('h1')).toBe(pl.app.heading);
    expect($('.preset[data-fixture="sensoryka-odra"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(text('.draft-title')).toBe(recordingOf('sensoryka-odra', 'pl').draft.title);
    expect(document.activeElement?.getAttribute('data-lang')).toBe('pl');

    switchTo('en');
    expect(text('.draft-title')).toBe(recordingOf('sensoryka-odra', 'en').draft.title);
  });

  it('keeps edited input as typed and re-runs it', () => {
    mountApp(root, { mode: 'recorded', embed: false, lang: 'en' });
    setField('closedFiscalYears', '13');
    submit();
    switchTo('pl');
    expect($<HTMLInputElement>('[name="closedFiscalYears"]')!.value).toBe('13');
    expect(text('.origin')).toBe(pl.draft.template);
  });

  it('keeps other URL parameters such as embed', () => {
    history.replaceState(null, '', '/?embed=1');
    mountApp(root, { mode: 'recorded', embed: true, lang: 'en' });
    switchTo('pl');
    expect(new URLSearchParams(location.search).get('embed')).toBe('1');
    expect(new URLSearchParams(location.search).get('lang')).toBe('pl');
  });
});

describe('embed mode', () => {
  it('marks the document for minimal chrome and keeps the notice and the switch', () => {
    mountApp(root, { mode: 'recorded', embed: true, lang: 'en' });
    expect(document.documentElement.dataset['embed']).toBe('1');
    expect(text('.disclaimer')).toMatch(/legal advice/i);
    expect($('.lang-switch')).not.toBeNull();
    expect($$('.site-footer a').length).toBeGreaterThanOrEqual(4);
  });

  it('reports its height to the parent page for iframe auto-sizing', () => {
    const postMessage = vi.fn();
    vi.stubGlobal('parent', { postMessage });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly callback: () => void) {}
        observe() {
          this.callback();
        }
      },
    );
    mountApp(root, { mode: 'recorded', embed: true, lang: 'en' });
    expect(postMessage).toHaveBeenCalledWith(
      { type: 'grant-assistant:height', height: expect.any(Number) },
      '*',
    );
  });
});

describe('live mode', () => {
  const recording = recordingOf('kowadlo-precyzja', 'en');

  it('does not call the API on load, then shows the draft the server returns', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ draft: recording.draft, model: 'claude-opus-5-5', bestCallId: 'x' }),
          { status: 200 },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);
    mountApp(root, { mode: 'live', embed: false, lang: 'en' });
    expect(fetchMock).not.toHaveBeenCalled();

    submit();
    await flush();
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as {
      company: { name: string };
      lang: string;
    };
    expect(body.company.name).toContain('Precyzja');
    expect(body.lang).toBe('en');
    await vi.waitFor(() => expect(text('.origin')).toBe('Live (Claude API) · claude-opus-5-5'));
    expect(text('.draft-title')).toBe(recording.draft.title);
    expect($('.draft-panel')!.getAttribute('aria-busy')).toBe('false');
  });

  it('does not call the API when the language is switched', () => {
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    mountApp(root, { mode: 'live', embed: false, lang: 'en' });
    submit();
    switchTo('pl');
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(text('.draft-hint')).toBe(pl.draft.switchedLanguage);
    expect($('.draft-panel')!.getAttribute('aria-busy')).toBe('false');
  });

  it('explains a network failure in the interface language', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    mountApp(root, { mode: 'live', embed: false, lang: 'pl' });
    submit();
    await vi.waitFor(() => expect(text('[role="alert"]')).toBe(pl.live.noConnection));
  });

  it('translates a known server error code', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: 'ANTHROPIC_API_KEY is not set', code: 'missing_api_key' }),
            { status: 500 },
          ),
        ),
    );
    mountApp(root, { mode: 'live', embed: false, lang: 'pl' });
    submit();
    await vi.waitFor(() => expect(text('[role="alert"]')).toBe(pl.live.apiErrors.missing_api_key));
  });

  it('falls back to the server message for an unknown error code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Teapot' }), { status: 418 })),
    );
    mountApp(root, { mode: 'live', embed: false, lang: 'en' });
    submit();
    await vi.waitFor(() => expect(text('[role="alert"]')).toBe('Teapot'));
  });

  it('clears the busy state when a newer run with no match supersedes a pending request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    mountApp(root, { mode: 'live', embed: false, lang: 'en' });
    submit();
    expect($('.draft-panel')!.getAttribute('aria-busy')).toBe('true');
    setField('size', 'large');
    submit();
    expect($('.draft-panel')!.getAttribute('aria-busy')).toBe('false');
  });
});
