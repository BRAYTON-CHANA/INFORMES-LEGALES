import login from '../../lib/handlers/auth/login.js';
import register from '../../lib/handlers/auth/register.js';
import verify from '../../lib/handlers/auth/verify.js';
import cambiarPassword from '../../lib/handlers/auth/cambiar-password.js';
import resetPasswordAdmin from '../../lib/handlers/auth/reset-password-admin.js';
import { cors, parseSegments } from '../../lib/shared/http.js';

const handlers = {
  login,
  register,
  verify,
  'cambiar-password': cambiarPassword,
  'reset-password-admin': resetPasswordAdmin,
};

export default async function handler(req, res) {
  if (cors(req, res)) return;

  // En Vercel la ruta completa llega en req.url: quedarse con lo que sigue a /auth
  let path = parseSegments(req);
  const authIdx = path.indexOf('auth');
  if (authIdx >= 0) path = path.slice(authIdx + 1);

  if (path.length === 1 && handlers[path[0]]) {
    return handlers[path[0]](req, res);
  }
  return res.status(404).json({ success: false, message: 'Ruta no encontrada' });
}
