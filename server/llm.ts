/**
 * The only module that talks to the Claude API (official @anthropic-ai/sdk).
 * Used by `npm run dev:live` and `npm run record`.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { DraftSchema } from '../src/domain/draft-schema';
import type { GenerateDraft } from './app';
import { HttpError } from './app';
import { buildPrompt } from './prompt';

export const MODEL = 'claude-opus-5-5';

export function createGenerator(client: Anthropic = new Anthropic()): GenerateDraft {
  return async (company, assessment) => {
    const prompt = buildPrompt(company, assessment);
    try {
      const response = await client.beta.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        // Opus 5.5 always thinks; effort is the depth control (its default is medium).
        output_config: { effort: 'medium', format: betaZodOutputFormat(DraftSchema) },
        // On a safety decline, let the API re-run the request on its recommended fallback model.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      });

      if (response.stop_reason === 'refusal') {
        throw new HttpError(502, 'Model odmówił przygotowania szkicu dla tych danych.');
      }
      if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
        throw new HttpError(502, 'Model nie zwrócił kompletnego szkicu. Spróbuj ponownie.');
      }
      return { draft: response.parsed_output, model: response.model };
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (error instanceof Anthropic.AuthenticationError) {
        throw new HttpError(500, 'Brak lub nieprawidłowy ANTHROPIC_API_KEY w pliku .env.');
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new HttpError(429, 'Limit zapytań do API — spróbuj za chwilę.');
      }
      throw error;
    }
  };
}
