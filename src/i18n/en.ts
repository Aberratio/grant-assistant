import { pluralEn } from './format';
import type { Messages } from './messages';

const years = (n: number) => `${n} closed fiscal ${pluralEn(n, 'year', 'years')}`;

export const en: Messages = {
  meta: {
    title: 'Grant application assistant — kokot.it',
    description:
      'Grant application assistant: matches a company to Polish EU funding calls with deterministic rules and drafts the project description with Claude.',
  },
  app: {
    heading: 'Grant application assistant',
    lead: 'Deterministic rules check which EU funding calls a company qualifies for and what it is missing. An AI model receives the rule result and drafts the project description and the document checklist.',
    modeTitle: 'Run mode',
    mode: {
      recorded: 'Recorded run',
      live: 'Live (Claude API)',
    },
    languageLabel: 'Language',
    disclaimerTitle: 'Not legal advice',
    disclaimer: (date) =>
      `Results are for information only and do not guarantee funding. The rules simplify each call's conditions, and the call data reflects the state as of ${date}. Verify the official regulations at the source before applying.`,
    companyHeading: 'Company',
    presetsLabel: 'Sample companies (fictional):',
    matchesHeading: 'Matching funding calls',
    draftHeading: 'Application draft',
    footerHeading: (date) => `Funding-call data — as of ${date}`,
    sampleData: 'Sample data · fictional companies',
  },
  form: {
    ariaLabel: 'Company details',
    name: 'Company name',
    industry: 'Sector',
    size: 'Size',
    voivodeship: 'Region (voivodeship)',
    closedFiscalYears: 'Closed fiscal years',
    netResult: 'Net result (PLN)',
    netResultPlaceholder: 'e.g. 250000 or -40000',
    netResultHint: 'For the last closed year. Leave empty if unknown.',
    deMinimis: 'De minimis limit available?',
    need: 'What is the funding for?',
    description: 'Short description of the need',
    descriptionPlaceholder: 'What does not work today and what do you want to change?',
    submit: 'Check eligibility',
  },
  formErrors: {
    nameRequired: 'Enter the company name.',
    nameTooLong: (max) => `The name can be at most ${max} characters long.`,
    descriptionTooLong: (max) => `The description can be at most ${max} characters long.`,
    industry: 'Choose a sector.',
    size: 'Choose the company size.',
    voivodeship: 'Choose a region.',
    deMinimis: 'Choose an answer.',
    need: 'Choose a need.',
    closedFiscalYears: 'Enter a whole number of years (0 or more).',
    netResult: 'Enter an amount in PLN or leave it empty.',
  },
  labels: {
    industry: {
      manufacturing: 'Manufacturing',
      manufacturing_services: 'Manufacturing services',
      it: 'IT',
      retail: 'Retail and wholesale',
      services: 'Other services',
    },
    size: {
      micro: 'Micro (<10)',
      small: 'Small (10–49)',
      medium: 'Medium (50–249)',
      large: 'Large (250+)',
    },
    need: {
      digital: 'Digital technology / AI rollout',
      rnd: 'R&D on a new product',
      training: 'Training and team development',
    },
    deMinimis: {
      yes: 'Yes',
      no: 'No (used up)',
      unknown: 'Not sure',
    },
    match: {
      eligible: 'Eligible',
      conditional: 'Conditional — to verify',
      ineligible: 'Not eligible',
    },
    condition: {
      met: 'met',
      unmet: 'not met',
      uncertain: 'to verify',
    },
  },
  match: {
    window: 'Call window',
    funding: 'Funding',
    sources: 'Sources: ',
    best: 'Best match',
    stateAsOf: (date) => `as of ${date}`,
    allConditions: (stateAsOf) => `All conditions, notes and sources (${stateAsOf})`,
    notesAndSources: (stateAsOf) => `Notes and sources (${stateAsOf})`,
  },
  draft: {
    eyebrow: (callName) => `Project description draft · ${callName}`,
    documents: 'Documents to prepare',
    openQuestions: 'To verify before applying',
    preparedOn: (date) => `draft prepared on ${date}`,
    template:
      'Template · the input differs from the recorded examples; a draft written by Claude is produced in live mode',
    loading: 'Claude is drafting from the rule result…',
    switchedLanguage: 'Submit the form to draft in English.',
  },
  noMatch: {
    heading: 'No funding call whose conditions the company meets',
    body: 'A draft is written only for a call with no unmet conditions. ',
    closest: (callName) => `The closest is “${callName}”, which still requires:`,
  },
  live: {
    noConnection: 'Cannot reach the API server. Check that it is running.',
    serverStatus: (status) => `The server responded with ${status}.`,
    unknownError: 'Unknown error.',
    apiErrors: {
      bad_request: 'The request could not be read.',
      invalid_company: 'The company details are invalid.',
      payload_too_large: 'The request is too large.',
      not_found: 'Not found.',
      method_not_allowed: 'Method not allowed.',
      unsupported_media_type: 'The request must be sent as JSON.',
      model_refused: 'The model declined to draft for this input.',
      model_incomplete: 'The model did not return a complete draft. Try again.',
      missing_api_key:
        'ANTHROPIC_API_KEY is missing or invalid — copy .env.example to .env and add the key.',
      rate_limited: 'API rate limit reached — try again in a moment.',
      generation_failed: 'The draft could not be generated. Check the server log.',
      server_error: 'Server error.',
    },
  },
  rules: {
    need: {
      digital: 'digital technology rollout',
      rnd: 'research and development (R&D)',
      training: 'training and development services',
    },
    sme: {
      label: 'SME status',
      met: 'The company declares micro, small or medium-sized enterprise status.',
      unmet: 'The call is open only to micro, small and medium-sized enterprises.',
    },
    region: {
      label: 'Registered in Lower Silesia',
      met: 'The company operates in the Lower Silesian voivodeship.',
      unmet: 'The programme funds only companies from the Lower Silesian voivodeship.',
    },
    scope: {
      met: (need) => `The company's need (${need}) is within the scope of the call.`,
      unmet: (funded, need) => `The call funds: ${funded} — not ${need}.`,
      rndServiceLabel: 'R&D service from a research organisation',
      developmentServiceLabel: 'Development service from the Development Services Database (BUR)',
      rndModuleLabel: 'Project includes the mandatory R&D module',
    },
    digit: {
      scopeLabel: 'Project rolls out digital technology',
      scope: {
        digital:
          'Dig.IT funds off-the-shelf and custom digital technology, including AI, analytics and automation.',
        training:
          'Training is eligible only as an additional cost (up to 40%) alongside a digital technology rollout.',
        rnd: 'Dig.IT funds digital technology rollouts, not R&D work — it fits only if the project is a rollout.',
      },
      industryLabel: 'Manufacturing or manufacturing services',
      industryMet: 'The main business is manufacturing or manufacturing services.',
      industryUnmet:
        'Dig.IT is for companies whose main business is manufacturing or manufacturing services.',
      yearsLabel: (min) => `At least ${min} closed fiscal years`,
      yearsMet: (n) => `The company has ${years(n)}.`,
      yearsUnmet: (n, missing) => `The company has ${years(n)} — ${missing} short.`,
      netLabel: 'Positive net result',
      netUnknown:
        'No data on the net result for the last closed year — check the financial statements.',
      netPositive: 'The net result for the last closed year is positive.',
      netZero: 'The net result is zero — the condition requires a positive result.',
      netNegative: 'The net result for the last closed year is negative.',
      deMinimisLabel: 'De minimis aid limit available',
      deMinimisYes: 'The company declares an unused de minimis limit.',
      deMinimisNo: 'The grant is de minimis aid — it cannot be awarded without an available limit.',
      deMinimisUnknown:
        'Check de minimis aid received in the last 3 years in SUDOP — the grant must fit within the limit.',
    },
  },
  template: {
    goal: {
      digital: 'a digital technology rollout',
      rnd: 'a research and development project',
      training: 'upskilling the team',
    },
    descriptionPlaceholder: '[describe the planned project in 3–5 sentences]',
    title: (goal, company) => `[Project title] — ${goal} at ${company}`,
    summary: (company, goal, callName) =>
      `${company} plans ${goal} under the “${callName}” call. This is a template to complete — a draft written by AI is produced in live mode.`,
    problemHeading: 'Problem and current situation',
    problemTodo:
      '[To complete: which processes work poorly today, what this costs (time, defects, complaints) and how you measure it.]',
    solutionHeading: 'Solution and project scope',
    solutionBody:
      '[To complete: what exactly will be rolled out or researched, in which stages, and who the contractor is.]',
    resultsHeading: 'Results and indicators',
    resultsBody:
      '[To complete: measurable effects after the project — e.g. time, defect rate, revenue — with baseline and target values.]',
    budgetHeading: 'Budget and schedule',
    budgetBody: (funding, window) =>
      `Funding terms: ${funding}. Call window: ${window}.\n\n[To complete: eligible costs, own contribution, milestones.]`,
    documentNote: 'Check the current template in the call documentation.',
  },
};
