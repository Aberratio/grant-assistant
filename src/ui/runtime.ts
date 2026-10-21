export type AppMode = 'recorded' | 'live';

/** `?embed=1` (or `embed=true`) renders minimal chrome for the kokot.it iframe. */
export function isEmbed(search: string): boolean {
  const value = new URLSearchParams(search).get('embed');
  return value === '1' || value === 'true';
}

/** Vite mode `live` is only used by `npm run dev:live`; every build is recorded. */
export function appMode(viteMode: string): AppMode {
  return viteMode === 'live' ? 'live' : 'recorded';
}
