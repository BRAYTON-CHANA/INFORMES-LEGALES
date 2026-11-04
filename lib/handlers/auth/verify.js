import { withAuth } from '../../middleware/auth.js';
import { soloMetodo } from '../../shared/http.js';

/** GET — devuelve la sesión vigente (payload del JWT con los roles actuales) */
async function handler(req, res) {
  if (!soloMetodo(req, res, 'GET')) return;
  res.json({ success: true, data: req.user });
}

export default withAuth(handler, { permitirCambioPendiente: true });
