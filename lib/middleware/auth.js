import jwt from 'jsonwebtoken';
import 'dotenv/config';
import DatabaseManager from '../database/DatabaseManager.js';
import { esAdmin } from '../shared/http.js';

/** Roles activos de un usuario, del más alto al más bajo */
export async function rolesDeUsuario(idUsuario) {
  return DatabaseManager.query(
    `SELECT r."ID_ROL" AS "id_rol", r."NOMBRE_ROL" AS "nombre", r."NIVEL_ACCESO" AS "nivel", r."ES_SISTEMA" AS "es_sistema"
     FROM "USUARIO_ROL" ur
     JOIN "ROLES" r ON r."ID_ROL" = ur."ID_ROL"
     WHERE ur."ID_USUARIO" = ? AND r."ACTIVO" = ?
     ORDER BY r."NIVEL_ACCESO" DESC`,
    idUsuario, true
  );
}

/*
 * El JWT solo identifica al usuario: si está activo, sus roles, su unidad
 * ejecutora y si debe cambiar la clave se leen de la BD (caché corta), así una
 * desactivación o un cambio de roles rige sin esperar a que venza el token.
 */
const CACHE_MS = Number(process.env.AUTH_CACHE_SEG ?? 60) * 1000;
const cache = new Map(); // id_usuario → { hasta, estado }

/** Olvida el estado en caché (de un usuario o de todos) tras cambiar cuentas o roles */
export function olvidarUsuario(idUsuario = null) {
  if (idUsuario == null) cache.clear();
  else cache.delete(Number(idUsuario));
}

async function estadoUsuario(idUsuario) {
  const id = Number(idUsuario);
  const enCache = cache.get(id);
  if (enCache && enCache.hasta > Date.now()) return enCache.estado;

  const [u] = await DatabaseManager.select('USUARIOS', { ID_USUARIO: id },
    ['ID_USUARIO', 'ACTIVO', 'REQUIERE_CAMBIO_PASSWORD']);
  const estado = u?.ACTIVO
    ? {
      activo: true,
      requiereCambio: Boolean(u.REQUIERE_CAMBIO_PASSWORD),
      roles: (await rolesDeUsuario(id)).map((r) => r.nombre),
    }
    : { activo: false };
  if (CACHE_MS > 0) cache.set(id, { hasta: Date.now() + CACHE_MS, estado });
  return estado;
}

export function verifyToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('No token provided');
    error.code = 401;
    throw error;
  }

  const token = authHeader.split(' ')[1];

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    const error = new Error('Token inválido o expirado');
    error.code = 401;
    throw error;
  }
}

/**
 * Exige JWT válido de un usuario activo; deja en req.user el payload con roles y
 * unidad ejecutora actuales. Con cambio de clave pendiente responde 403, salvo
 * `permitirCambioPendiente` (cambiar-password, verify).
 */
export function withAuth(handler, { permitirCambioPendiente = false } = {}) {
  return async (req, res) => {
    let payload;
    try {
      payload = verifyToken(req);
    } catch (error) {
      return res.status(error.code || 401).json({ success: false, message: error.message });
    }
    if (await cargarUsuario(req, res, payload, permitirCambioPendiente)) return handler(req, res);
  };
}

/**
 * Como withAuth, pero sin cabecera Authorization deja req.user = null y sigue
 * (visitante del repositorio público). Con token, lo valida igual que withAuth.
 */
export function withAuthOpcional(handler) {
  return async (req, res) => {
    if (!req.headers.authorization) {
      req.user = null;
      return handler(req, res);
    }
    return withAuth(handler)(req, res);
  };
}

/** Valida el usuario del token y llena req.user; false si ya respondió el error */
async function cargarUsuario(req, res, payload, permitirCambioPendiente) {
  try {
    const estado = await estadoUsuario(payload.id_usuario);
    if (!estado.activo) {
      res.status(401).json({ success: false, message: 'Usuario inactivo' });
      return false;
    }
    if (estado.requiereCambio && !permitirCambioPendiente) {
      res.status(403).json({ success: false, code: 'CAMBIO_PASSWORD', message: 'Debes cambiar tu contraseña antes de continuar' });
      return false;
    }
    req.user = { ...payload, roles: estado.roles };
    return true;
  } catch (error) {
    console.error('[auth] Error al validar la sesión:', error);
    res.status(500).json({ success: false, message: 'Error interno' });
    return false;
  }
}

/** Exige JWT válido con rol admin */
export function withAdmin(handler) {
  return withAuth((req, res) => {
    if (!esAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Solo para administración' });
    }
    return handler(req, res);
  });
}
