import catalogos from '../../lib/handlers/catalogos.js';
import { withAuth } from '../../lib/middleware/auth.js';
import { cors, parseSegments } from '../../lib/shared/http.js';

async function handler(req, res) {
  let segments = parseSegments(req);
  const idx = segments.indexOf('catalogos');
  if (idx >= 0) segments = segments.slice(idx + 1);
  return catalogos(req, res, segments);
}

const conAuth = withAuth(handler);

export default async function (req, res) {
  if (cors(req, res)) return;
  return conAuth(req, res);
}
