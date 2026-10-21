import { CALLS, DATA_STATE_AS_OF, getCall, type FundingCall } from '../data/calls';
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
import { findRecording } from '../recordings';
import { h, paragraphs } from './dom';
import { companyToEntries, parseCompany, type FormEntries } from './form-parse';
import {
  CONDITION_MARK,
  DE_MINIMIS_LABEL,
  INDUSTRY_LABEL,
  MATCH_LABEL,
  NEED_LABEL,
  SIZE_LABEL,
  VOIVODESHIP_LABEL,
  formatDate,
} from './labels';
import type { AppMode } from './runtime';

export interface AppOptions {
  mode: AppMode;
  embed: boolean;
}

const DISCLAIMER =
  'To demo, a nie porada prawna ani gwarancja dotacji. Reguły są uproszczone, a dane naborów pochodzą ' +
  `ze stanu na ${formatDate(DATA_STATE_AS_OF)} — przed złożeniem wniosku sprawdź regulamin u źródła.`;

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

function buildForm(): HTMLFormElement {
  const descriptionId = 'f-description';
  return h(
    'form',
    { class: 'company-form', novalidate: true, 'aria-label': 'Dane firmy' },
    input('name', 'Nazwa firmy', {
      type: 'text',
      required: true,
      maxlength: String(LIMITS.nameMaxLength),
      autocomplete: 'off',
    }),
    h(
      'div',
      { class: 'field-row' },
      select('industry', 'Branża', INDUSTRIES, INDUSTRY_LABEL),
      select('size', 'Wielkość', COMPANY_SIZES, SIZE_LABEL),
    ),
    h(
      'div',
      { class: 'field-row' },
      select('voivodeship', 'Województwo', VOIVODESHIPS, VOIVODESHIP_LABEL),
      input('closedFiscalYears', 'Zamknięte lata obrotowe', {
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
        'Wynik netto za ostatni rok (zł)',
        { type: 'text', inputmode: 'decimal', placeholder: 'np. 250000 lub -40000' },
        'Puste = nie wiem.',
      ),
      select('deMinimisAvailable', 'Wolny limit de minimis?', DE_MINIMIS, DE_MINIMIS_LABEL),
    ),
    select('need', 'Na co potrzebne są środki?', NEEDS, NEED_LABEL),
    h(
      'div',
      { class: 'field' },
      h('label', { for: descriptionId }, 'Krótki opis potrzeby'),
      h('textarea', {
        id: descriptionId,
        name: 'description',
        rows: '5',
        maxlength: String(LIMITS.descriptionMaxLength),
        placeholder: 'Co dziś nie działa i co chcecie zmienić?',
        'aria-describedby': `${descriptionId}-error`,
      }),
      h('p', { class: 'field-error', id: `${descriptionId}-error`, 'aria-live': 'polite' }),
    ),
    h('button', { type: 'submit', class: 'btn-primary' }, 'Sprawdź dopasowanie'),
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

function fillForm(form: HTMLFormElement, company: CompanyProfile): void {
  for (const [key, value] of Object.entries(companyToEntries(company))) {
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

const draftHeading = () => h('h2', {}, 'Szkic wniosku');

function sourceLinks(call: FundingCall): (HTMLElement | string)[] {
  return call.sources.flatMap((s, i) => [
    i > 0 ? ' · ' : '',
    h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, s.label),
  ]);
}

function conditionList(conditions: readonly ConditionResult[]): HTMLElement {
  return h(
    'ul',
    { class: 'conditions' },
    conditions.map((c) =>
      h(
        'li',
        { class: `condition condition--${c.status}` },
        h(
          'span',
          { class: 'condition-icon', 'aria-hidden': 'true' },
          CONDITION_MARK[c.status].symbol,
        ),
        h(
          'div',
          {},
          h('span', { class: 'condition-label' }, c.label),
          h('span', { class: 'visually-hidden' }, ` — ${CONDITION_MARK[c.status].label}. `),
          h('span', { class: 'condition-detail' }, c.detail),
        ),
      ),
    ),
  );
}

function matchCard(match: CallMatch, isBest: boolean): HTMLElement {
  const call = getCall(match.callId);
  const compact = match.status === 'ineligible';
  const meta = h(
    'dl',
    { class: 'match-meta' },
    h('dt', {}, 'Nabór'),
    h('dd', {}, call.window),
    h('dt', {}, 'Finansowanie'),
    h('dd', {}, call.funding),
  );
  const notes = [
    h(
      'ul',
      {},
      call.notes.map((n) => h('li', {}, n)),
    ),
    h('p', { class: 'sources' }, 'Źródła: ', sourceLinks(call)),
  ];
  const stateAsOf = `stan na ${formatDate(call.stateAsOf)}`;

  return h(
    'article',
    { class: `match match--${match.status}${isBest ? ' match--best' : ''}` },
    h(
      'header',
      { class: 'match-header' },
      h(
        'div',
        {},
        isBest ? h('p', { class: 'eyebrow' }, 'Najlepsze dopasowanie') : null,
        h('h3', {}, call.name),
        h('p', { class: 'match-operator' }, call.operator),
      ),
      h('span', { class: `badge badge--${match.status}` }, MATCH_LABEL[match.status]),
    ),
    compact
      ? [
          conditionList(match.conditions.filter((c) => c.status === 'unmet')),
          h(
            'details',
            { class: 'match-notes' },
            h('summary', {}, `Wszystkie warunki, uwagi i źródła (${stateAsOf})`),
            meta,
            conditionList(match.conditions),
            notes,
          ),
        ]
      : [
          meta,
          conditionList(match.conditions),
          h(
            'details',
            { class: 'match-notes' },
            h('summary', {}, `Uwagi i źródła (${stateAsOf})`),
            notes,
          ),
        ],
  );
}

function originLabel(origin: DraftOrigin): string {
  switch (origin.kind) {
    case 'recording':
      return origin.source === 'api'
        ? `Nagranie przebiegu ${origin.model} z ${formatDate(origin.recordedAt)} — odtwarzane deterministycznie`
        : `Nagranie (szkic przygotowany offline ${formatDate(origin.recordedAt)}) — odtwarzane deterministycznie`;
    case 'template':
      return 'Szablon — dane różnią się od nagranych przykładów; szkic pisany przez AI działa w trybie live (npm run dev:live)';
    case 'live':
      return `Na żywo — ${origin.model}`;
  }
}

function draftView(draft: Draft, origin: DraftOrigin, callName: string): HTMLElement {
  const part = (key: TimelineTarget, el: HTMLElement) => {
    el.dataset['part'] = key;
    return el;
  };

  return h(
    'div',
    { class: 'draft' },
    h('p', { class: `origin origin--${origin.kind}` }, originLabel(origin)),
    h('p', { class: 'eyebrow' }, `Szkic opisu projektu · ${callName}`),
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
        h('h4', {}, 'Dokumenty do przygotowania'),
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
            h('h4', {}, 'Do sprawdzenia przed wnioskiem'),
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

function noMatchView(assessment: Assessment): HTMLElement {
  const closest = assessment.ranked[0];
  const call = closest ? getCall(closest.callId) : null;
  const unmet = closest?.conditions.filter((c) => c.status === 'unmet') ?? [];
  return h(
    'div',
    { class: 'draft draft--empty' },
    h('h3', {}, 'Brak naboru, którego warunki firma spełnia'),
    h(
      'p',
      {},
      'Szkic opisu powstaje tylko dla naboru bez niespełnionych warunków. ',
      call ? `Najbliżej jest „${call.name}” — brakuje:` : '',
    ),
    h(
      'ul',
      {},
      unmet.map((c) => h('li', {}, `${c.label}: ${c.detail}`)),
    ),
  );
}

async function fetchLiveDraft(company: CompanyProfile, signal: AbortSignal) {
  const res = await fetch('./api/draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ company }),
    signal,
  });
  const body = (await res.json().catch(() => ({}))) as {
    draft?: Draft | null;
    model?: string | null;
    error?: string;
  };
  if (!res.ok || !body.draft || !body.model) {
    throw new Error(body.error ?? `Serwer zwrócił ${res.status}.`);
  }
  return { draft: body.draft, model: body.model };
}

export function mountApp(root: HTMLElement, options: AppOptions): void {
  document.documentElement.dataset['embed'] = options.embed ? '1' : '0';

  const form = buildForm();
  const resultsList = h('div', { class: 'matches' });
  const draftPanel = h('div', {
    class: 'panel draft-panel',
    'aria-live': 'polite',
    'aria-busy': 'false',
  });
  const presetButtons = FIXTURES.map((f) =>
    h(
      'button',
      { type: 'button', class: 'preset', 'data-fixture': f.id, 'aria-pressed': 'false' },
      f.label,
    ),
  );

  let runId = 0;
  let abort: AbortController | null = null;
  const timers: number[] = [];

  const play = (draftEl: HTMLElement, draft: Draft) => {
    timers.splice(0).forEach((t) => clearTimeout(t));
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
    const view = draftView(draft, origin, callName);
    draftPanel.replaceChildren(draftHeading(), view);
    play(view, draft);
  };

  const run = async (company: CompanyProfile) => {
    const id = ++runId;
    abort?.abort();
    timers.splice(0).forEach((t) => clearTimeout(t));
    // A superseded live request skips its own reset (id !== runId), so reset here.
    draftPanel.setAttribute('aria-busy', 'false');

    const assessment = assess(company);
    resultsList.replaceChildren(
      ...assessment.ranked.map((m) => matchCard(m, m.callId === assessment.best?.callId)),
    );

    if (!assessment.best) {
      draftPanel.replaceChildren(draftHeading(), noMatchView(assessment));
      return;
    }
    const callName = getCall(assessment.best.callId).name;

    if (options.mode === 'recorded') {
      const recording = findRecording(company);
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
        const draft = templateDraft(company, assessment);
        if (draft) showDraft(draft, { kind: 'template' }, callName);
      }
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
        'Claude pisze szkic na podstawie wyniku reguł…',
      ),
    );
    try {
      const { draft, model } = await fetchLiveDraft(company, abort.signal);
      if (id !== runId) return;
      showDraft(draft, { kind: 'live', model }, callName);
    } catch (error) {
      if (id !== runId || (error instanceof DOMException && error.name === 'AbortError')) return;
      draftPanel.replaceChildren(
        draftHeading(),
        h(
          'p',
          { class: 'error', role: 'alert' },
          error instanceof Error ? error.message : 'Nieznany błąd.',
        ),
      );
    } finally {
      if (id === runId) draftPanel.setAttribute('aria-busy', 'false');
    }
  };

  const selectPreset = (fixtureId: string | null) => {
    for (const b of presetButtons)
      b.setAttribute('aria-pressed', String(b.dataset['fixture'] === fixtureId));
  };

  presetButtons.forEach((button) =>
    button.addEventListener('click', () => {
      const fixture = FIXTURES.find((f) => f.id === button.dataset['fixture']);
      if (!fixture) return;
      fillForm(form, fixture.company);
      showErrors(form, {});
      selectPreset(fixture.id);
      void run(fixture.company);
    }),
  );

  form.addEventListener('input', () => selectPreset(null));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const parsed = parseCompany(readForm(form));
    if (!parsed.ok) {
      showErrors(form, parsed.errors);
      return;
    }
    showErrors(form, {});
    void run(parsed.company);
  });

  const modeBadge =
    options.mode === 'live'
      ? h('span', { class: 'mode mode--live' }, 'tryb live · Claude API')
      : h('span', { class: 'mode' }, 'tryb nagrany · bez API');

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
          h('span', { class: 'brand-mark' }, 'kokot.it'),
          ' / projekty pokazowe',
        ),
        h('h1', {}, 'Asystent wniosku dotacyjnego'),
        h(
          'p',
          { class: 'lead' },
          'Deterministyczne reguły sprawdzają, do których naborów UE firma pasuje i czego brakuje. Model AI dostaje wynik reguł i szkicuje opis projektu oraz listę dokumentów.',
        ),
      ),
      h(
        'div',
        { class: 'topbar' },
        h(
          'p',
          { class: 'disclaimer', role: 'note' },
          h('strong', {}, 'Zastrzeżenie: '),
          DISCLAIMER,
        ),
        modeBadge,
      ),
      h(
        'main',
        { class: 'layout' },
        h(
          'section',
          { class: 'panel form-panel', 'aria-labelledby': 'form-heading' },
          h('h2', { id: 'form-heading' }, 'Firma'),
          h('p', { class: 'presets-label', id: 'presets-label' }, 'Przykładowe firmy (fikcyjne):'),
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
            h('h2', { id: 'matches-heading' }, 'Dopasowane nabory'),
            resultsList,
          ),
          draftPanel,
        ),
      ),
      h(
        'footer',
        { class: 'site-footer' },
        h('h2', {}, `Dane naborów — stan na ${formatDate(DATA_STATE_AS_OF)}`),
        h(
          'ul',
          {},
          CALLS.map((c) => h('li', {}, `${c.name}: `, sourceLinks(c))),
        ),
        h('p', {}, 'Wszystkie przykładowe firmy są fikcyjne. ' + DISCLAIMER),
      ),
    ),
  );

  if (options.embed) reportHeight(root);

  const first = FIXTURES[0];
  if (first) {
    fillForm(form, first.company);
    if (options.mode === 'recorded') {
      selectPreset(first.id);
      void run(first.company);
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
