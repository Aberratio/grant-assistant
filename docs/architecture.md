# Architecture and design decisions

## Principle

Eligibility is decided by code, not by the model. Each funding call has a plain TypeScript
rule function that returns every condition as `met`, `unmet` or `uncertain` with an
explanation in the interface language. Claude receives the finished rule result, the matched call's data and the
company description, and writes the project description and document checklist. It is
never asked to re-judge eligibility.

## Languages

- The repository is written in English. Polish appears only in the Polish dictionary
  (`src/i18n/pl.ts`) and in data: funding calls (`src/data/`), sample companies
  (`src/fixtures/`) and recorded drafts (`src/recordings/`). `npm run check:language` enforces
  this in CI; official programme names are the only Polish words allowed in prose.
- Every visitor-facing text exists in English and Polish. `src/i18n/messages.ts` defines the
  dictionary shape, so a missing key is a type error; a test also compares the key sets.
- Language: `?lang=en|pl` first (for embeds), then the first supported browser language,
  then English. The EN / PL switch re-renders the app, keeps other URL parameters and replays
  the same sample company; in live mode it re-runs the rules but waits for a submit before
  calling the API again.
- Rules decide the same statuses in both languages; `lang` only selects the wording. The
  language is part of the run hash, so each language has its own recording.
- The live server receives `lang`, writes the rule result in that language and asks Claude
  for the draft in it through the user message; the system prompt stays fixed. Server
  errors carry a stable `code` that the browser translates.

## Rules and ranking

- A call is `ineligible` if any condition is unmet, `conditional` if any is uncertain
  (for example an unknown net result), otherwise `eligible`.
- Ranking: status (eligible → conditional → ineligible), then fewer open questions, then a
  fixed call order — smaller, simpler instruments first (Dig.IT, STEP, 7.4A, SMART). A
  Lower Silesian R&D project therefore gets the STEP voucher before Ścieżka SMART MŚP.
- Dig.IT's "positive net result" is encoded as a hard rule. It comes from the call's
  regulations rather than the call announcement, so the call notes say to confirm it.
- For an R&D or training need, Dig.IT's scope is `uncertain`, not `unmet`: the call funds
  custom digital technology and allows training as an additional cost (≤ 40%), so the rule
  cannot rule it out.
- Call data in `src/data/calls.ts` (caps, additional-cost limits, annex lists, eligible R&D
  providers) was read on the official pages on the date stated in the file; every call links
  to its sources.

## Two run modes

- **Recorded run** (default, every static build). The four sample companies replay stored
  runs from `src/recordings/<lang>/*.json`. Each recording stores a hash of its language, input, the rule
  result and the matched call's data (`src/domain/hash.ts`: canonical JSON + FNV-1a). The
  test suite fails if a rule, call or fixture change makes a recording stale, so an outdated
  draft is never replayed silently. Replay timing is a deterministic timeline
  (`src/domain/playback.ts`).
- **Edited input in recorded mode** gets a deterministic, clearly labelled template draft
  (`src/domain/template-draft.ts`); the rules still run in the browser.
- **Live (Claude API)**. `npm run dev:live` starts a Node server on `127.0.0.1` that holds
  the API key, recomputes the rules itself (it never trusts the browser's result) and calls
  Claude with structured output validated against a Zod schema.

The committed recordings are marked `source: "prepared"` with `model: null`: they follow the
live prompt's contract — only facts from the input and the call data, unknowns left as `[…]`
placeholders — in the exact output shape of the live mode. `npm run record` with an API key
replaces them with captured runs (`source: "api"`, model id and date).

## Security boundary

- The API key is read only by the server process; it is not `VITE_`-prefixed and never
  reaches the client bundle.
- ESLint forbids imports of `server/` and `@anthropic-ai/sdk` from browser code (`src/`).
- The API validates input with Zod, limits the request body to 16 KiB, hides internal error
  details and does not call the model when no call matches.
- Model and user text is rendered through text nodes only, never as markup.

## Brand and assets

`src/styles/tokens.css` is a verbatim copy of the kokot.it design tokens followed by a short
block of app-only layout sizes; `app.css` uses only those custom properties. A contrast test
computes WCAG AA for every text/background pair from `tokens.css`, so a brand change that
breaks contrast fails the suite. Fonts are self-hosted (SIL Open Font License 1.1), so the
embedded app makes no third-party requests.

## Testing notes

- `src/recordings/recordings.test.ts` reads the committed recordings rather than a frozen
  copy — catching a recording made stale by a rule, data or fixture change is the point.
- `@typescript-eslint/no-non-null-assertion` is off in `*.test.ts` only: fixtures are
  known-present and assertions on them fail loudly anyway.
- Playwright is a dev dependency used only by `scripts/screenshots.ts`; browsers are not
  downloaded by `npm ci`, so CI does not need them.
- `npm run check:wording` scans the static build and the documentation for wording that must
  not ship, including its Polish inflections; it runs in CI after the build.
