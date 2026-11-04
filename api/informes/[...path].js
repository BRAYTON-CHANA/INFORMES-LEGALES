import informes from '../../lib/handlers/informes/index.js';
import { withAuthOpcional } from '../../lib/middleware/auth.js';
import { cors, parseSegments } from '../../lib/shared/http.js';

async function handler(req, res) {
  let segments = parseSegments(req);
  const idx = segments.indexOf('informes');
  if (idx >= 0) segments = segments.slice(idx + 1);
  return informes(req, res, segments);
}

// Repositorio público: sin sesión se lista, se ve la ficha y se descarga lo público (ver permisos.js)
const conAuth = withAuthOpcional(handler);

export default async function (req, res) {
  if (cors(req, res)) return;
  return conAuth(req, res);
}
