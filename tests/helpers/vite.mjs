import { after } from 'node:test';
import { createServer } from 'vite';

// The suite runs without test isolation: share one module runner and local socket.
export const vite = await createServer({ server: { middlewareMode: true, hmr: false, watch: null } });
after(() => vite.close());
