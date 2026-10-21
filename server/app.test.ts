import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApiServer, type GenerateDraft } from './app';
import { getFixture } from '../src/fixtures/companies';
import { getRecordingDraft } from './test-helpers';

let server: Server | undefined;

async function start(generate: GenerateDraft): Promise<string> {
  server = createApiServer({ generate, log: () => {} });
  await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  const running = server;
  server = undefined;
  if (running) await new Promise((resolve) => running.close(resolve));
});

const post = (base: string, body: unknown) =>
  fetch(`${base}/api/draft`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/draft', () => {
  const { company } = getFixture('kowadlo-precyzja');

  it('recomputes the rules server-side and returns the generated draft', async () => {
    const draft = getRecordingDraft('kowadlo-precyzja');
    const generate = vi.fn<GenerateDraft>().mockResolvedValue({ draft, model: 'claude-opus-5-5' });
    const base = await start(generate);

    const res = await post(base, { company });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      draft,
      model: 'claude-opus-5-5',
      bestCallId: 'digit-2-2026',
    });
    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0]![1].best?.callId).toBe('digit-2-2026');
  });

  it('does not call the model when no call matches', async () => {
    const generate = vi.fn<GenerateDraft>();
    const base = await start(generate);
    const res = await post(base, { company: { ...company, size: 'duza' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ draft: null, model: null, bestCallId: null });
    expect(generate).not.toHaveBeenCalled();
  });

  it.each([
    ['malformed JSON', '{nope'],
    ['missing company', {}],
    ['unknown industry', { company: { ...company, industry: 'rolnictwo' } }],
    ['negative years', { company: { ...company, closedFiscalYears: -1 } }],
    ['fractional years', { company: { ...company, closedFiscalYears: 2.5 } }],
    ['overlong description', { company: { ...company, description: 'x'.repeat(2001) } }],
  ])('rejects %s with 400', async (_name, body) => {
    const generate = vi.fn<GenerateDraft>();
    const base = await start(generate);
    const res = await post(base, body);
    expect(res.status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });

  it('rejects a body over 16 kB with 413', async () => {
    const base = await start(vi.fn<GenerateDraft>());
    const res = await post(base, { company, pad: 'x'.repeat(17_000) });
    expect(res.status).toBe(413);
  });

  it('hides upstream error details behind a 502', async () => {
    const base = await start(
      vi.fn<GenerateDraft>().mockRejectedValue(new Error('sk-ant-secret boom')),
    );
    const res = await post(base, { company });
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(text).not.toContain('sk-ant-secret');
  });

  it('answers 404 for other paths and 405 for other methods', async () => {
    const base = await start(vi.fn<GenerateDraft>());
    expect((await fetch(`${base}/api/other`)).status).toBe(404);
    expect((await fetch(`${base}/api/draft`)).status).toBe(405);
  });

  it('reports health without touching the model', async () => {
    const generate = vi.fn<GenerateDraft>();
    const base = await start(generate);
    const res = await fetch(`${base}/api/health`);
    expect(await res.json()).toEqual({ ok: true, mode: 'live' });
    expect(generate).not.toHaveBeenCalled();
  });
});
