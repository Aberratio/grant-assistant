/**
 * Local API for the live mode. Binds to 127.0.0.1 only; the Vite dev server
 * proxies /api to it. The Anthropic key lives in this process and never reaches
 * the browser.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Draft } from '../src/domain/draft';
import { assess, type Assessment } from '../src/domain/rules';
import type { CompanyProfile } from '../src/domain/types';
import { DraftRequestSchema } from './company-schema';

export type GenerateDraft = (
  company: CompanyProfile,
  assessment: Assessment,
) => Promise<{ draft: Draft; model: string }>;

export interface ApiOptions {
  generate: GenerateDraft;
  log?: (message: string) => void;
}

const MAX_BODY_BYTES = 16 * 1024;

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Zapytanie jest za duże.');
    chunks.push(buf);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new HttpError(400, 'Nieprawidłowy JSON.');
  }
}

async function handleDraft(req: IncomingMessage, res: ServerResponse, options: ApiOptions) {
  const parsed = DraftRequestSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, 'Nieprawidłowe dane firmy.');
  const company = parsed.data.company;

  // Rules run here again: the server never trusts a rule result from the browser.
  const assessment = assess(company);
  if (!assessment.best) {
    send(res, 200, { draft: null, model: null, bestCallId: null });
    return;
  }

  try {
    const { draft, model } = await options.generate(company, assessment);
    send(res, 200, { draft, model, bestCallId: assessment.best.callId });
  } catch (error) {
    options.log?.(`generate failed: ${error instanceof Error ? error.message : String(error)}`);
    const status = error instanceof HttpError ? error.status : 502;
    const message =
      error instanceof HttpError
        ? error.message
        : 'Nie udało się wygenerować szkicu. Sprawdź log serwera.';
    send(res, status, { error: message });
  }
}

export function createApiServer(options: ApiOptions): Server {
  return createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    const run = async () => {
      if (path === '/api/health') return send(res, 200, { ok: true, mode: 'live' });
      if (path !== '/api/draft') throw new HttpError(404, 'Nie znaleziono.');
      if (req.method !== 'POST') throw new HttpError(405, 'Dozwolona metoda: POST.');
      // JSON only: a cross-site "simple" (text/plain) POST cannot get here without a
      // CORS preflight, which this server never answers.
      if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) {
        throw new HttpError(415, 'Wymagany Content-Type: application/json.');
      }
      await handleDraft(req, res, options);
    };
    run().catch((error: unknown) => {
      if (!(error instanceof HttpError)) {
        options.log?.(`request failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : 'Błąd serwera.';
      if (!res.headersSent) send(res, status, { error: message });
      // Drop the rest of an oversized upload only after the 413 has been flushed.
      if (status === 413) res.once('finish', () => req.destroy());
    });
  });
}

export { HttpError };
