import { DATA_STATE_AS_OF, getCall, listCalls, type FundingCall } from '../data/calls';
import { VOIVODESHIP_LABEL } from '../data/regions';
import { API_ERROR_CODES, type ApiErrorCode } from '../domain/api';
import type { Draft, DraftOrigin } from '../domain/draft';
import { buildTimeline, type TimelineTarget } from '../domain/playback';
import { assess, type Assessment } from '../domain/rules';
import { templateDraft } from '../domain/template-draft';
import {
  COMPANY_SIZES,
  DE_MINIMIS,
  INDUSTRIES,
  LIMITS,
  NEEDS,
  VOIVODESHIPS,
  type CallMatch,
  type ConditionResult,
  type CompanyProfile,
} from '../domain/types';
import { FIXTURES } from '../fixtures/companies';
import { formatDate } from '../i18n/format';
import { LANGS, searchWithLang, type Lang } from '../i18n/lang';
import { messages, type Messages } from '../i18n/messages';
import { findRecording } from '../recordings';
import { h, paragraphs } from './dom';
import { companyToEntries, parseCompany, type FormEntries } from './form-parse';
import type { AppMode } from './runtime';
import logoUrl from '../assets/brand/logo.svg';

export interface AppOptions {
  mode: AppMode;
  embed: boolean;
  lang: Lang;
}

/** Language names in their own language, so each is recognisable to its readers. */
const LANG_NAME: Record<Lang, string> = { en: 'English', pl: 'Polski' };

const CONDITION_SYMBOL = { met: '✓', unmet: '✕', uncertain: '?' } as const;

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function select<T extends string>(
  name: keyof CompanyProfile,
  label: string,
  options: readonly T[],
  labels: Record<T, string>,
): HTMLElement {
  const id = `f-${name}`;
  return h(
    'div',
    { class: 'field' },
    h('label', { for: id }, label),
    h(
      'select',
      { id, name, required: true, 'aria-describedby': `${id}-error` },
      options.map((o) => h('option', { value: o }, labels[o])),
    ),
    h('p', { class: 'field-error', id: `${id}-error`, 'aria-live': 'polite' }),
  );
}

function input(
  name: keyof CompanyProfile,
  label: string,
  attrs: Record<string, string | boolean>,
  hint?: string,
): HTMLElement {
  const id = `f-${name}`;
  const describedBy = [hint ? `${id}-hint` : '', `${id}-error`].filter(Boolean).join(' ');
  return h(
    'div',
    { class: 'field' },
    h('label', { for: id }, label),
    h('input', { id, name, 'aria-describedby': describedBy, ...attrs }),
    hint ? h('p', { class: 'field-hint', id: `${id}-hint` }, hint) : null,
    h('p', { class: 'field-error', id: `${id}-error`, 'aria-live': 'polite' }),
  );
}

function buildForm(t: Messages, lang: Lang): HTMLFormElement {
  const f = t.form;
  const descriptionId = 'f-description';
  return h(
    'form',
    { class: 'company-form', novalidate: true, 'aria-label': f.ariaLabel },
    input('name', f.name, {
      type: 'text',
      required: true,
      maxlength: String(LIMITS.nameMaxLength),
      autocomplete: 'off',
    }),
    h(
      'div',
      { class: 'field-row' },
      select('industry', f.industry, INDUSTRIES, t.labels.industry),
      select('size', f.size, COMPANY_SIZES, t.labels.size),
    ),
    h(
      'div',
      { class: 'field-row' },
      select('voivodeship', f.voivodeship, VOIVODESHIPS, VOIVODESHIP_LABEL[lang]),
      input('closedFiscalYears', f.closedFiscalYears, {
        type: 'number',
        min: '0',
        max: String(LIMITS.maxClosedFiscalYears),
        step: '1',
        inputmode: 'numeric',
        required: true,
      }),
    ),
    h(
      'div',
      { class: 'field-row' },
      input(
        'netResultPln',
        f.netResult,
        { type: 'text', inputmode: 'decimal', placeholder: f.netResultPlaceholder },
        f.netResultHint,
      ),
      select('deMinimisAvailable', f.deMinimis, DE_MINIMIS, t.labels.deMinimis),
    ),
    select('need', f.need, NEEDS, t.labels.need),
    h(
      'div',
      { class: 'field' },
      h('label', { for: descriptionId }, f.description),
      h('textarea', {
        id: descriptionId,
        name: 'description',
        rows: '5',
        maxlength: String(LIMITS.descriptionMaxLength),
        placeholder: f.descriptionPlaceholder,
        'aria-describedby': `${descriptionId}-error`,
      }),
      h('p', { class: 'field-error', id: `${descriptionId}-error`, 'aria-live': 'polite' }),
    ),
    h('button', { type: 'submit', class: 'btn-primary' }, f.submit),
  );
}

function readForm(form: HTMLFormElement): FormEntries {
  const data = new FormData(form);
  const get = (k: string) => String(data.get(k) ?? '');
  return {
    name: get('name'),
    industry: get('industry'),
    size: get('size'),
    voivodeship: get('voivodeship'),
    closedFiscalYears: get('closedFiscalYears'),
    netResultPln: get('netResultPln'),
    deMinimisAvailable: get('deMinimisAvailable'),
    need: get('need'),
    description: get('description'),
  };
}

function fillForm(form: HTMLFormElement, entries: FormEntries): void {
  for (const [key, value] of Object.entries(entries)) {
    const el = form.elements.namedItem(key);
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement
    ) {
      el.value = value;
    }
  }
}

function showErrors(form: HTMLFormElement, errors: Partial<Record<string, string>>): void {
  form.querySelectorAll<HTMLElement>('.field-error').forEach((el) => (el.textContent = ''));
  form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
  let first: HTMLElement | null = null;
  for (const [key, message] of Object.entries(errors)) {
    const field = form.querySelector<HTMLElement>(`#f-${key}`);
    const error = form.querySelector<HTMLElement>(`#f-${key}-error`);
    if (error) error.textContent = message ?? '';
    if (field) {
      field.setAttribute('aria-invalid', 'true');
      first ??= field;
    }
  }
  first?.focus();
}

function sourceLinks(call: FundingCall): (HTMLElement | string)[] {
  return call.sources.flatMap((s, i) => [
    i > 0 ? ' · ' : '',
    h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.label),
  ]);
}

function conditionList(t: Messages, conditions: readonly ConditionResult[]): HTMLElement {
  return h(
    'ul',
    { class: 'conditions' },
    conditions.map((c) =>
      h(
        'li',
        { class: `condition condition--${c.status}` },
        h('span', { class: 'condition-icon', 'aria-hidden': 'true' }, CONDITION_SYMBOL[c.status]),
        h(
          'div',
          {},
          h('span', { class: 'condition-label' }, c.label),
          h('span', { class: 'visually-hidden' }, ` — ${t.labels.condition[c.status]}. `),
          h('span', { class: 'condition-detail' }, c.detail),
        ),
      ),
    ),
  );
}

function matchCard(t: Messages, lang: Lang, match: CallMatch, isBest: boolean): HTMLElement {
  const call = getCall(match.callId, lang);
  const compact = match.status === 'ineligible';
  const meta = h(
    'dl',
    { class: 'match-meta' },
    h('dt', {}, t.match.window),
    h('dd', {}, call.window),
    h('dt', {}, t.match.funding),
    h('dd', {}, call.funding),
  );
  const notes = [
    h(
      'ul',
      {},
      call.notes.map((n) => h('li', {}, n)),
    ),
    h('p', { class: 'sources' }, t.match.sources, sourceLinks(call)),
  ];
  const stateAsOf = t.match.stateAsOf(formatDate(call.stateAsOf, lang));

  return h(
    'article',
    { class: `match match--${match.status}${isBest ? ' match--best' : ''}` },
    h(
      'header',
      { class: 'match-header' },
      h(
        'div',
        {},
        isBest ? h('p', { class: 'eyebrow' }, t.match.best) : null,
        h('h3', {}, call.name),
        h('p', { class: 'match-operator' }, call.operator),
      ),
      h('span', { class: `badge badge--${match.status}` }, t.labels.match[match.status]),
    ),
    compact
      ? [
          conditionList(
            t,
            match.conditions.filter((c) => c.status === 'unmet'),
          ),
          h(
            'details',
            { class: 'match-notes' },
            h('summary', {}, t.match.allConditions(stateAsOf)),
            meta,
            conditionList(t, match.conditions),
            notes,
          ),
        ]
      : [
          meta,
          conditionList(t, match.conditions),
          h(
            'details',
            { class: 'match-notes' },
            h('summary', {}, t.match.notesAndSources(stateAsOf)),
            notes,
          ),
        ],
  );
}

function originLabel(t: Messages, lang: Lang, origin: DraftOrigin): string {
  switch (origin.kind) {
    case 'recording':
      return origin.source === 'api'
        ? `${t.app.mode.recorded} · ${origin.model} · ${formatDate(origin.recordedAt, lang)}`
        : `${t.app.mode.recorded} · ${t.draft.preparedOn(formatDate(origin.recordedAt, lang))}`;
    case 'template':
      return t.draft.template;
    case 'live':
      return `${t.app.mode.live} · ${origin.model}`;
  }
}

function draftView(
  t: Messages,
  lang: Lang,
  draft: Draft,
  origin: DraftOrigin,
  callName: string,
): HTMLElement {
  const part = (key: TimelineTarget, el: HTMLElement) => {
    el.dataset['part'] = key;
    return el;
  };

  return h(
    'div',
    { class: 'draft' },
    h('p', { class: `origin origin--${origin.kind}` }, originLabel(t, lang, origin)),
    h('p', { class: 'eyebrow' }, t.draft.eyebrow(callName)),
    h('h3', { class: 'draft-title' }, draft.title),
    part('summary', h('p', { class: 'draft-summary' }, draft.summary)),
    draft.sections.map((s, i) =>
      part(
        `section:${i}`,
        h('section', { class: 'draft-section' }, h('h4', {}, s.heading), paragraphs(s.body)),
      ),
    ),
    part(
      'documents',
      h(
        'section',
        { class: 'draft-section' },
        h('h4', {}, t.draft.documents),
        h(
          'ol',
          { class: 'documents' },
          draft.documents.map((d) =>
            h('li', {}, h('strong', {}, d.name), h('span', { class: 'doc-note' }, d.note)),
          ),
        ),
      ),
    ),
    part(
      'questions',
      draft.openQuestions.length
        ? h(
            'section',
            { class: 'draft-section draft-questions' },
            h('h4', {}, t.draft.openQuestions),
            h(
              'ul',
              {},
              draft.openQuestions.map((q) => h('li', {}, q)),
            ),
          )
        : h('div'),
    ),
  );
}

function noMatchView(t: Messages, lang: Lang, assessment: Assessment): HTMLElement {
  const closest = assessment.ranked[0];
  const call = closest ? getCall(closest.callId, lang) : null;
  const unmet = closest?.conditions.filter((c) => c.status === 'unmet') ?? [];
  return h(
    'div',
    { class: 'draft draft--empty' },
    h('h3', {}, t.noMatch.heading),
    h('p', {}, t.noMatch.body, call ? t.noMatch.closest(call.name) : ''),
    h(
      'ul',
      {},
      unmet.map((c) => h('li', {}, `${c.label}: ${c.detail}`)),
    ),
  );
}

const isApiErrorCode = (code: unknown): code is ApiErrorCode =>
  (API_ERROR_CODES as readonly unknown[]).includes(code);

async function fetchLiveDraft(
  t: Messages,
  company: CompanyProfile,
  lang: Lang,
  signal: AbortSignal,
) {
  let res: Response;
  try {
    res = await fetch('./api/draft', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ company, lang }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error(t.live.noConnection, { cause: error });
  }
  const body = (await res.json().catch(() => ({}))) as {
    draft?: Draft | null;
    model?: string | null;
    error?: string;
    code?: string;
  };
  if (!res.ok || !body.draft || !body.model) {
    if (isApiErrorCode(body.code)) throw new Error(t.live.apiErrors[body.code]);
    throw new Error(body.error ?? t.live.serverStatus(res.status));
  }
  return { draft: body.draft, model: body.model };
}

function setDocumentLanguage(t: Messages, lang: Lang): void {
  document.documentElement.lang = lang;
  document.title = t.meta.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.meta.description);
}

export function mountApp(root: HTMLElement, options: AppOptions): void {
  document.documentElement.dataset['embed'] = options.embed ? '1' : '0';

  let lang = options.lang;
  let t = messages(lang);
  /** Preset whose data is in the form, or null once the visitor edits it. */
  let fixtureId: string | null = null;
  /** Whether the form has been run at least once (the switch then re-runs it). */
  let hasRun = false;

  let runId = 0;
  let abort: AbortController | null = null;
  const timers: number[] = [];

  let form = buildForm(t, lang);
  const resultsList = h('div', { class: 'matches' });
  const draftPanel = h('div', {
    class: 'panel draft-panel',
    'aria-live': 'polite',
    'aria-busy': 'false',
  });
  let presetButtons: HTMLButtonElement[] = [];

  const draftHeading = () => h('h2', {}, t.app.draftHeading);

  const play = (draftEl: HTMLElement, draft: Draft) => {
    timers.splice(0).forEach((tm) => clearTimeout(tm));
    const steps = buildTimeline(draft, { reducedMotion: prefersReducedMotion() });
    for (const step of steps) {
      const el = draftEl.querySelector<HTMLElement>(`[data-part="${step.target}"]`);
      if (!el) continue;
      if (step.atMs === 0) continue;
      el.classList.add('is-pending');
      timers.push(window.setTimeout(() => el.classList.remove('is-pending'), step.atMs));
    }
  };

  const showDraft = (draft: Draft, origin: DraftOrigin, callName: string) => {
    const view = draftView(t, lang, draft, origin, callName);
    draftPanel.replaceChildren(draftHeading(), view);
    play(view, draft);
  };

  /** `draft: false` runs only the rules (used after a language switch in live mode). */
  const run = async (company: CompanyProfile, { draft = true } = {}) => {
    const id = ++runId;
    hasRun = true;
    abort?.abort();
    timers.splice(0).forEach((tm) => clearTimeout(tm));
    // A superseded live request skips its own reset (id !== runId), so reset here.
    draftPanel.setAttribute('aria-busy', 'false');

    const assessment = assess(company, lang);
    resultsList.replaceChildren(
      ...assessment.ranked.map((m) => matchCard(t, lang, m, m.callId === assessment.best?.callId)),
    );

    if (!assessment.best) {
      draftPanel.replaceChildren(draftHeading(), noMatchView(t, lang, assessment));
      return;
    }
    const callName = getCall(assessment.best.callId, lang).name;

    if (options.mode === 'recorded') {
      const recording = findRecording(company, lang);
      if (recording) {
        const origin: DraftOrigin =
          recording.source === 'api'
            ? {
                kind: 'recording',
                source: 'api',
                model: recording.model,
                recordedAt: recording.recordedAt,
              }
            : {
                kind: 'recording',
                source: 'prepared',
                model: null,
                recordedAt: recording.recordedAt,
              };
        showDraft(recording.draft, origin, callName);
      } else {
        const fallback = templateDraft(company, assessment, lang);
        if (fallback) showDraft(fallback, { kind: 'template' }, callName);
      }
      return;
    }

    if (!draft) {
      draftPanel.replaceChildren(
        draftHeading(),
        h('p', { class: 'draft-hint' }, t.draft.switchedLanguage),
      );
      return;
    }

    abort = new AbortController();
    draftPanel.setAttribute('aria-busy', 'true');
    draftPanel.replaceChildren(
      draftHeading(),
      h(
        'p',
        { class: 'loading' },
        h('span', { class: 'spinner', 'aria-hidden': 'true' }),
        t.draft.loading,
      ),
    );
    try {
      const result = await fetchLiveDraft(t, company, lang, abort.signal);
      if (id !== runId) return;
      showDraft(result.draft, { kind: 'live', model: result.model }, callName);
    } catch (error) {
      if (id !== runId || (error instanceof DOMException && error.name === 'AbortError')) return;
      draftPanel.replaceChildren(
        draftHeading(),
        h(
          'p',
          { class: 'error', role: 'alert' },
          error instanceof Error ? error.message : t.live.unknownError,
        ),
      );
    } finally {
      if (id === runId) draftPanel.setAttribute('aria-busy', 'false');
    }
  };

  const selectPreset = (id: string | null) => {
    fixtureId = id;
    for (const b of presetButtons)
      b.setAttribute('aria-pressed', String(b.dataset['fixture'] === id));
  };

  const runPreset = (id: string) => {
    const fixture = FIXTURES.find((f) => f.id === id);
    if (!fixture) return;
    fillForm(form, companyToEntries(fixture.company[lang]));
    showErrors(form, {});
    selectPreset(fixture.id);
    void run(fixture.company[lang]);
  };

  const wireForm = () => {
    form.addEventListener('input', () => selectPreset(null));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const parsed = parseCompany(readForm(form), lang);
      if (!parsed.ok) {
        showErrors(form, parsed.errors);
        return;
      }
      showErrors(form, {});
      void run(parsed.company);
    });
  };

  const switchLanguage = (next: Lang) => {
    if (next === lang) return;
    const entries = readForm(form);
    lang = next;
    t = messages(lang);
    try {
      history.replaceState(history.state, '', searchWithLang(location.search, lang));
    } catch {
      // Sandboxed iframes may forbid history changes; the switch still works.
    }
    render();
    root.querySelector<HTMLElement>(`.lang-switch [data-lang="${lang}"]`)?.focus();

    if (fixtureId) {
      const fixture = FIXTURES.find((f) => f.id === fixtureId);
      if (fixture) {
        fillForm(form, companyToEntries(fixture.company[lang]));
        selectPreset(fixture.id);
        if (hasRun) void run(fixture.company[lang], { draft: options.mode === 'recorded' });
      }
      return;
    }
    // Edited input is kept as typed; enum values do not depend on the language.
    fillForm(form, entries);
    if (!hasRun) return;
    const parsed = parseCompany(entries, lang);
    if (parsed.ok) void run(parsed.company, { draft: options.mode === 'recorded' });
    else showErrors(form, parsed.errors);
  };

  const languageSwitch = () =>
    h(
      'div',
      { class: 'lang-switch', role: 'group', 'aria-label': t.app.languageLabel },
      LANGS.map((code) => {
        const button = h(
          'button',
          {
            type: 'button',
            lang: code,
            'data-lang': code,
            'aria-pressed': String(code === lang),
            title: LANG_NAME[code],
            'aria-label': LANG_NAME[code],
          },
          code.toUpperCase(),
        );
        button.addEventListener('click', () => switchLanguage(code));
        return button;
      }),
    );

  const render = () => {
    setDocumentLanguage(t, lang);
    timers.splice(0).forEach((tm) => clearTimeout(tm));
    abort?.abort();
    runId++;
    form = buildForm(t, lang);
    wireForm();
    resultsList.replaceChildren();
    draftPanel.setAttribute('aria-busy', 'false');
    draftPanel.replaceChildren(draftHeading());

    presetButtons = FIXTURES.map((f) => {
      const button = h(
        'button',
        {
          type: 'button',
          class: 'preset',
          'data-fixture': f.id,
          'aria-pressed': String(f.id === fixtureId),
        },
        f.label[lang],
      );
      button.addEventListener('click', () => runPreset(f.id));
      return button;
    });

    const dataDate = formatDate(DATA_STATE_AS_OF, lang);

    root.replaceChildren(
      h(
        'div',
        { class: 'shell' },
        h(
          'header',
          { class: 'site-header' },
          h(
            'p',
            { class: 'brand' },
            h(
              'a',
              { href: 'https://kokot.it', target: '_blank', rel: 'noopener noreferrer' },
              h('img', { class: 'brand-logo', src: logoUrl, alt: 'kokot.it' }),
            ),
          ),
          h('h1', {}, t.app.heading),
          h('p', { class: 'lead' }, t.app.lead),
        ),
        h(
          'div',
          { class: 'topbar' },
          h(
            'aside',
            { class: 'disclaimer', role: 'note', 'aria-labelledby': 'disclaimer-title' },
            h('span', { class: 'disclaimer-icon', 'aria-hidden': 'true' }, '!'),
            h(
              'div',
              {},
              h('p', { class: 'disclaimer-title', id: 'disclaimer-title' }, t.app.disclaimerTitle),
              h('p', { class: 'disclaimer-body' }, t.app.disclaimer(dataDate)),
            ),
          ),
          h(
            'div',
            { class: 'topbar-meta' },
            languageSwitch(),
            h(
              'span',
              { class: `mode mode--${options.mode}`, title: t.app.modeTitle },
              t.app.mode[options.mode],
            ),
          ),
        ),
        h(
          'main',
          { class: 'layout' },
          h(
            'section',
            { class: 'panel form-panel', 'aria-labelledby': 'form-heading' },
            h('h2', { id: 'form-heading' }, t.app.companyHeading),
            h('p', { class: 'presets-label', id: 'presets-label' }, t.app.presetsLabel),
            h(
              'div',
              { class: 'presets', role: 'group', 'aria-labelledby': 'presets-label' },
              presetButtons,
            ),
            form,
          ),
          h(
            'div',
            { class: 'results' },
            h(
              'section',
              { class: 'panel', 'aria-labelledby': 'matches-heading' },
              h('h2', { id: 'matches-heading' }, t.app.matchesHeading),
              resultsList,
            ),
            draftPanel,
          ),
        ),
        h(
          'footer',
          { class: 'site-footer' },
          h('h2', {}, t.app.footerHeading(dataDate)),
          h(
            'ul',
            {},
            listCalls(lang).map((c) => h('li', {}, `${c.name}: `, sourceLinks(c))),
          ),
          h(
            'div',
            { class: 'footer-meta' },
            h('p', { class: 'sample-data' }, t.app.sampleData),
            h(
              'p',
              { class: 'byline' },
              '© 2026 ',
              h(
                'a',
                { href: 'https://kokot.it', target: '_blank', rel: 'noopener noreferrer' },
                'kokot.it',
              ),
            ),
          ),
        ),
      ),
    );
  };

  render();
  if (options.embed) reportHeight(root);

  const first = FIXTURES[0];
  if (first) {
    // Live mode fills the form but waits for a submit: every live run costs an API call.
    if (options.mode === 'recorded') runPreset(first.id);
    else {
      fillForm(form, companyToEntries(first.company[lang]));
      selectPreset(first.id);
    }
  }
}

/** Lets the parent page size the iframe: posts {type, height} on every resize. */
function reportHeight(root: HTMLElement): void {
  if (window.parent === window || typeof ResizeObserver !== 'function') return;
  const post = () =>
    window.parent.postMessage(
      { type: 'grant-assistant:height', height: Math.ceil(root.getBoundingClientRect().height) },
      '*',
    );
  new ResizeObserver(post).observe(root);
}
