import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { handleDatasets, handleEarth } from '../server/nasa.ts';

type NextFunction = (error?: unknown) => void;

function middleware(req: IncomingMessage, res: ServerResponse, next: NextFunction): void {
  const url = req.url ?? '';
  if (url === '/api/nasa/earth') {
    void handleEarth(req, res);
    return;
  }
  if (url.startsWith('/api/nasa/datasets')) {
    void handleDatasets(req, res);
    return;
  }
  next();
}

export function nasaApiPlugin(): Plugin {
  return {
    name: 'arogya-nasa-api',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
