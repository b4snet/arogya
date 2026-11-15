import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleEarth } from '../../server/nasa';

export default function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handleEarth(req, res);
}
