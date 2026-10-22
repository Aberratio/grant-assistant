/**
 * Local API for the live mode. Binds to 127.0.0.1 only; the Vite dev server
 * proxies /api to it. The Anthropic key lives in this process and never reaches
 * the browser.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { ApiErrorBody, ApiErrorCode } from '../src/domain/api';
import type { Draft } from '../src/domain/draft';
import { assess, type Assessment } from '../src/domain/rules';
import type { CompanyProfile } from '../src/domain/types';
import type { Lang } from '../src/i18n/lang';
import { DraftRequestSchema } from './company-schema';

export type GenerateDraft = (
  company: CompanyProfile,
  assessment: Assessment,
  lang: Lang,
) => Promise<{ draft: Draft; model: string }>;

export interface ApiOptions {
  generate: GenerateDraft;
  log?: (message: string) => void;
}

const MAX_BODY_BYTES = 16 * 1024;

/** An error with an HTTP status and a stable code the browser translates. */
class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function sendError(res: ServerResponse, status: number, code: ApiErrorCode, message: string) {
  const body: ApiErrorBody = { error: message, code };
  send(res, status, body);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, 'payload_too_large', 'Request body is too large.');
    }
    chunks.push(buf);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new HttpError(400, 'bad_request', 'Invalid JSON.');
  }
}

async function handleDraft(req: IncomingMessage, res: ServerResponse, options: ApiOptions) {
  const parsed = DraftRequestSchema.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, 'invalid_company', 'Invalid company data.');
  const { company, lang } = parsed.data;

  // Rules run here again: the server never trusts a rule result from the browser.
  const assessment = assess(company, lang);
  if (!assessment.best) {
    send(res, 200, { draft: null, model: null, bestCallId: null });
    return;
  }

  try {
    const { draft, model } = await options.generate(company, assessment, lang);
    send(res, 200, { draft, model, bestCallId: assessment.best.callId });
  } catch (error) {
    options.log?.(`generate failed: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof HttpError) {
      sendError(res, error.status, error.code, error.message);
    } else {
      sendError(
        res,
        502,
        'generation_failed',
        'The draft could not be generated. Check the server log.',
      );
    }
  }
}

export function createApiServer(options: ApiOptions): Server {
  return createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    const run = async () => {
      if (path === '/api/health') return send(res, 200, { ok: true, mode: 'live' });
      if (path !== '/api/draft') throw new HttpError(404, 'not_found', 'Not found.');
      if (req.method !== 'POST') {
        throw new HttpError(405, 'method_not_allowed', 'Allowed method: POST.');
      }
      // JSON only: a cross-site "simple" (text/plain) POST cannot get here without a
      // CORS preflight, which this server never answers.
      if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) {
        throw new HttpError(
          415,
          'unsupported_media_type',
          'Content-Type must be application/json.',
        );
      }
      await handleDraft(req, res, options);
    };
    run().catch((error: unknown) => {
      if (!(error instanceof HttpError)) {
        options.log?.(`request failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      const status = error instanceof HttpError ? error.status : 500;
      if (!res.headersSent) {
        if (error instanceof HttpError) sendError(res, status, error.code, error.message);
        else sendError(res, 500, 'server_error', 'Server error.');
      }
      // Drop the rest of an oversized upload only after the 413 has been flushed.
      if (status === 413) res.once('finish', () => req.destroy());
    });
  });
}

export { HttpError };
