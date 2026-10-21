/**
 * `npm run dev:live` — local API server (holds the Anthropic key) + Vite dev
 * server in `live` mode that proxies /api to it. Both listen on localhost only.
 */
import { createServer as createViteServer } from 'vite';
import { createApiServer } from '../server/app';
import { createGenerator } from '../server/llm';
import { apiPort, loadLocalEnv } from './env';

loadLocalEnv();
const port = apiPort();

const api = createApiServer({
  generate: createGenerator(),
  log: (m) => console.error(`[api] ${m}`),
});
await new Promise<void>((resolve) => api.listen(port, '127.0.0.1', resolve));
console.log(`[api] listening on http://127.0.0.1:${port}`);

const vite = await createViteServer({
  mode: 'live',
  server: {
    host: '127.0.0.1',
    proxy: { '/api': `http://127.0.0.1:${port}` },
  },
});
await vite.listen();
vite.printUrls();

const shutdown = () => {
  api.close();
  void vite.close().then(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
