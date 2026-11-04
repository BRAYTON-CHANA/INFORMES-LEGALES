/**
 * Utilidades comunes de los handlers (req, res) estilo Vercel.
 */

/** Orígenes de CORS_ORIGIN (separados por coma). `*` o vacío = ninguno (mismo origen) */
export const origenesCors = () =>
  (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter((o) => o && o !== '*');

/**
 * Cabeceras CORS solo si CORS_ORIGIN lo pide (frontend en otro dominio) y el
 * origen de la petición está en la lista. Por defecto, mismo origen: sin CORS.
 * Devuelve true si era un preflight OPTIONS (ya respondido).
 */
export function cors(req, res) {
  const origen = req.headers.origin;
  if (origen && origenesCors().includes(origen)) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Accept, Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

/** Responde 405 y devuelve false si el método no está permitido */
export function soloMetodo(req, res, ...metodos) {
  if (metodos.includes(req.method)) return true;
  res.status(405).json({ success: false, message: 'Método no permitido' });
  return false;
}

/**
 * Segmentos de ruta de un catch-all `[...path].js`.
 * Vercel los pasa en req.query['...path']; en Express (app.use) req.url ya
 * viene sin el prefijo montado.
 */
export function parseSegments(req) {
  const raw = req.query?.['...path'] ?? req.query?.path;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string' && raw) return raw.split('/').filter(Boolean);
  return (req.url || '').split('?')[0].split('/').filter(Boolean);
}

/**
 * 500 sin detalles internos: el mensaje real (SQL, tablas) va solo al log del servidor.
 * Los errores con `status` 4xx (validación) se devuelven tal cual.
 */
export function error500(res, tag, error) {
  if (error?.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  console.error(`[${tag}] Error:`, error);
  if (!res.headersSent) res.status(500).json({ success: false, message: 'Error interno del servidor' });
}

export function esAdmin(user) {
  return Array.isArray(user?.roles) && user.roles.includes('admin');
}

export function clientIp(req) {
  // Express con `trust proxy` (Cloud Run): req.ip es la IP que añadió el proxy de Google,
  // no la primera de x-forwarded-for (esa la puede inventar el cliente)
  if (req.ip) return req.ip;
  const fwd = req.headers['x-forwarded-for'];
  return (typeof fwd === 'string' && fwd.split(',').pop().trim()) || req.socket?.remoteAddress || null;
}
