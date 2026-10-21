/** Loads .env (if present) into process.env and reports whether a key is configured. */
export function loadLocalEnv(): { hasKey: boolean } {
  try {
    process.loadEnvFile('.env');
  } catch {
    // No .env file — fine for credentials coming from the environment.
  }
  const hasKey = Boolean(process.env['ANTHROPIC_API_KEY']?.trim());
  if (!hasKey) {
    console.warn(
      '[grant-assistant] ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add a key, ' +
        'otherwise requests to Claude will fail with an authentication error.',
    );
  }
  return { hasKey };
}

export function apiPort(): number {
  const raw = Number(process.env['GRANT_ASSISTANT_API_PORT'] ?? 8787);
  return Number.isInteger(raw) && raw > 0 && raw < 65536 ? raw : 8787;
}
