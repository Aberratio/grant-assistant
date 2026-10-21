// @vitest-environment jsdom
/**
 * The UI flow end to end in a DOM: form → rules → ranked matches → draft.
 * Rules, recordings and the template run for real; only `fetch` is stubbed
 * for the live mode (no network, no key).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RECORDINGS } from '../recordings';
import { mountApp } from './app';

let root: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  root = document.querySelector<HTMLElement>('#app')!;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
const $$ = (sel: string) => [...root.querySelectorAll<HTMLElement>(sel)];
const text = (sel: string) => $(sel)?.textContent ?? '';

function setField(name: string, value: string) {
  const el = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function submit() {
  $<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('recorded mode', () => {
  beforeEach(() => mountApp(root, { mode: 'recorded', embed: false }));

  it('shows the disclaimer with the data date and a mode badge', () => {
    expect(text('.disclaimer')).toMatch(/nie porada prawna ani gwarancja dotacji/);
    expect(text('.disclaimer')).toContain('21.10.2026');
    expect(text('.mode')).toContain('tryb nagrany');
  });

  it('lists every funding call with source links in the footer', () => {
    const links = $$('.site-footer a').map((a) => a.getAttribute('href'));
    expect(links).toContain('https://digit.arp.pl/eventy/nabory/digit-konkurs-22026/');
    expect(links.length).toBeGreaterThanOrEqual(4);
  });

  it('replays the first sample company on load: Dig.IT first, recorded draft and documents', () => {
    const recording = RECORDINGS.find((r) => r.fixtureId === 'kowadlo-precyzja')!;
    expect(text('.match--best h3')).toContain('Dig.IT');
    expect(text('.origin')).toContain('Nagranie');
    expect(text('.draft-title')).toBe(recording.draft.title);
    expect($$('.documents li')).toHaveLength(recording.draft.documents.length);
  });

  it('shows the unmet five-year condition for the young carpentry shop', () => {
    $$('.preset')
      .find((b) => b.textContent?.includes('Stolarnia'))!
      .click();
    const digit = $$('.match').find((m) => m.textContent?.includes('Dig.IT'))!;
    expect(digit.className).toContain('match--ineligible');
    expect(digit.querySelector('.condition--unmet')?.textContent).toContain('brakuje 2');
    expect(text('.match--best h3')).toContain('7.4A');
  });

  it('falls back to a labelled template when the input differs from the recordings', () => {
    setField('closedFiscalYears', '13');
    submit();
    expect(text('.origin')).toContain('Szablon');
    expect($$('.preset').every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
  });

  it('explains what is missing when no call matches', () => {
    setField('size', 'duza');
    submit();
    expect(text('.draft--empty h3')).toContain('Brak naboru');
    expect(text('.draft--empty')).toContain('Status MŚP');
  });

  it('shows field errors instead of running on invalid input', () => {
    const before = text('.draft-title');
    setField('name', '  ');
    submit();
    expect($('#f-name')!.getAttribute('aria-invalid')).toBe('true');
    expect(text('#f-name-error')).toContain('Podaj nazwę');
    expect(text('.draft-title')).toBe(before);
  });

  it('renders model and user text as text, never as markup', () => {
    setField('name', '<img src=x onerror=alert(1)>');
    submit();
    expect(root.querySelector('img')).toBeNull();
    expect(text('.draft-title')).toContain('<img');
  });
});

describe('embed mode', () => {
  it('marks the document for minimal chrome and keeps the disclaimer', () => {
    mountApp(root, { mode: 'recorded', embed: true });
    expect(document.documentElement.dataset['embed']).toBe('1');
    expect(text('.disclaimer')).toMatch(/nie porada prawna/);
  });
});

describe('live mode', () => {
  const recording = RECORDINGS.find((r) => r.fixtureId === 'kowadlo-precyzja')!;

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
    mountApp(root, { mode: 'live', embed: false });
    expect(fetchMock).not.toHaveBeenCalled();

    submit();
    await flush();
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as {
      company: { name: string };
    };
    expect(body.company.name).toContain('Kowadło');
    await vi.waitFor(() => expect(text('.origin')).toContain('Na żywo — claude-opus-5-5'));
    expect(text('.draft-title')).toBe(recording.draft.title);
    expect($('.draft-panel')!.getAttribute('aria-busy')).toBe('false');
  });

  it('shows the server error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: 'Brak ANTHROPIC_API_KEY' }), { status: 500 }),
        ),
    );
    mountApp(root, { mode: 'live', embed: false });
    submit();
    await vi.waitFor(() => expect(text('[role="alert"]')).toContain('Brak ANTHROPIC_API_KEY'));
  });

  it('clears the busy state when a newer run with no match supersedes a pending request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
    mountApp(root, { mode: 'live', embed: false });
    submit();
    expect($('.draft-panel')!.getAttribute('aria-busy')).toBe('true');
    setField('size', 'duza');
    submit();
    expect($('.draft-panel')!.getAttribute('aria-busy')).toBe('false');
  });
});
