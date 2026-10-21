import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { assess } from '../src/domain/rules';
import { getFixture } from '../src/fixtures/companies';
import { HttpError } from './app';
import { createGenerator, MODEL } from './llm';
import { SYSTEM_PROMPT } from './prompt';
import { getRecordingDraft } from './test-helpers';

const { company } = getFixture('kowadlo-precyzja');
const assessment = assess(company);
const draft = getRecordingDraft('kowadlo-precyzja');

function fakeClient(parse: (...args: unknown[]) => Promise<unknown>) {
  return { beta: { messages: { parse: vi.fn(parse) } } } as unknown as Anthropic & {
    beta: { messages: { parse: ReturnType<typeof vi.fn> } };
  };
}

describe('createGenerator', () => {
  it('asks Claude Opus 5.5 for a structured draft with the fixed system prompt', async () => {
    const client = fakeClient(async () => ({
      stop_reason: 'end_turn',
      parsed_output: draft,
      model: MODEL,
    }));
    const result = await createGenerator(client)(company, assessment);

    expect(result).toEqual({ draft, model: MODEL });
    const params = client.beta.messages.parse.mock.calls[0]![0] as Record<string, unknown>;
    expect(params['model']).toBe('claude-opus-5-5');
    expect(params['system']).toBe(SYSTEM_PROMPT);
    expect(params['fallbacks']).toBe('default');
    expect(params['betas']).toEqual(['server-side-fallback-2026-07-01']);
    expect(params).not.toHaveProperty('thinking');
    expect((params['output_config'] as { effort: string }).effort).toBe('medium');
  });

  it('turns a refusal into a 502 without reading content', async () => {
    const client = fakeClient(async () => ({ stop_reason: 'refusal', parsed_output: null }));
    await expect(createGenerator(client)(company, assessment)).rejects.toMatchObject({
      status: 502,
    });
  });

  it('turns a truncated answer into a 502', async () => {
    const client = fakeClient(async () => ({ stop_reason: 'max_tokens', parsed_output: draft }));
    await expect(createGenerator(client)(company, assessment)).rejects.toBeInstanceOf(HttpError);
  });

  it('explains a missing or wrong API key', async () => {
    const client = fakeClient(async () => {
      throw new Anthropic.AuthenticationError(401, undefined, 'invalid x-api-key', new Headers());
    });
    await expect(createGenerator(client)(company, assessment)).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining('ANTHROPIC_API_KEY'),
    });
  });

  it('explains missing credentials (client-side SDK error, no HTTP call made)', async () => {
    const client = fakeClient(async () => {
      throw new Anthropic.AnthropicError('Could not resolve authentication method.');
    });
    await expect(createGenerator(client)(company, assessment)).rejects.toMatchObject({
      status: 500,
      message: expect.stringContaining('ANTHROPIC_API_KEY'),
    });
  });

  it('maps rate limiting to 429', async () => {
    const client = fakeClient(async () => {
      throw new Anthropic.RateLimitError(429, undefined, 'rate limited', new Headers());
    });
    await expect(createGenerator(client)(company, assessment)).rejects.toMatchObject({
      status: 429,
    });
  });
});
