/**
 * Contract of the local live-mode API, shared by the server and the browser.
 * The server answers errors as `{ error: <English message>, code }`; the UI shows
 * its own translation of `code` and falls back to `error` for unknown codes.
 */
export const API_ERROR_CODES = [
  'bad_request',
  'invalid_company',
  'payload_too_large',
  'not_found',
  'method_not_allowed',
  'unsupported_media_type',
  'model_refused',
  'model_incomplete',
  'missing_api_key',
  'rate_limited',
  'generation_failed',
  'server_error',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorBody {
  error: string;
  code: ApiErrorCode;
}
