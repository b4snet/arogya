import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleDatasets } from '../../server/nasa';

export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handleDatasets(req, res);
}
