import DatabaseManager from '../../database/DatabaseManager.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { soloMetodo, clientIp, error500 } from '../../shared/http.js';
import { MAX_INTENTOS, MINUTOS_BLOQUEO, esDni } from '../../config/credenciales.js';
import { rolesDeUsuario, olvidarUsuario } from '../../middleware/auth.js';

// Límite por IP (además del bloqueo por cuenta): frena el probar muchas cuentas
const POR_IP_MAX = Number(process.env.LOGIN_MAX_POR_IP_MINUTO || 20);
const intentosIp = new Map(); // ip → { desde, n }

function excedeIp(ip) {
  const ahora = Date.now();
  const r = intentosIp.get(ip);
  if (!r || ahora - r.desde > 60_000) {
    intentosIp.set(ip, { desde: ahora, n: 1 });
    if (intentosIp.size > 10_000) for (const [k, v] of intentosIp) if (ahora - v.desde > 60_000) intentosIp.delete(k);
    return false;
  }
  r.n += 1;
  return r.n > POR_IP_MAX;
}

const INCORRECTO = 'DNI o contraseña incorrectos';

/** POST { dni, password } — se entra solo con el DNI */
export default async function handler(req, res) {
  if (!soloMetodo(req, res, 'POST')) return;
  if (excedeIp(clientIp(req) || 'desconocida')) {
    return res.status(429).json({ success: false, message: 'Demasiados intentos desde esta conexión. Espera un minuto.' });
  }

  const dni = String(req.body?.dni || '').trim();
  const password = req.body?.password;
  if (!dni || !password) {
    return res.status(400).json({ success: false, message: 'DNI y contraseña son obligatorios' });
  }
  if (!esDni(dni)) return res.status(401).json({ success: false, message: INCORRECTO });

  try {
    const [user] = await DatabaseManager.query(
      `SELECT "ID_USUARIO", "NOMBRES", "APELLIDOS", "EMAIL", "DNI", "PASSWORD_HASH",
              "REQUIERE_CAMBIO_PASSWORD", "INTENTOS_FALLIDOS", "BLOQUEADO_HASTA"
       FROM "USUARIOS"
       WHERE "DNI" = ? AND "ACTIVO" = ?`,
      dni, true
    );

    const ahora = new Date();
    const bloqueada = user?.BLOQUEADO_HASTA && new Date(user.BLOQUEADO_HASTA) > ahora;

    // Mismo mensaje para usuario inexistente y clave incorrecta
    const ok = user?.PASSWORD_HASH && await bcrypt.compare(password, user.PASSWORD_HASH);
    if (bloqueada) {
      if (!ok) return res.status(401).json({ success: false, message: INCORRECTO });
      const min = Math.ceil((new Date(user.BLOQUEADO_HASTA) - ahora) / 60000);
      return res.status(429).json({ success: false, message: `Cuenta bloqueada por intentos fallidos. Intenta en ${min} min.` });
    }
    if (!ok) {
      if (user) {
        const intentos = Number(user.INTENTOS_FALLIDOS || 0) + 1;
        const bloquear = intentos >= MAX_INTENTOS;
        await DatabaseManager.update('USUARIOS', user.ID_USUARIO, {
          INTENTOS_FALLIDOS: bloquear ? 0 : intentos,
          BLOQUEADO_HASTA: bloquear ? new Date(ahora.getTime() + MINUTOS_BLOQUEO * 60000) : null,
        }, 'ID_USUARIO');
      }
      // Mismo mensaje al bloquear: no revela si la cuenta existe (el bloqueo se informa
      // recién cuando se intenta con la clave correcta o al pedírselo al admin)
      return res.status(401).json({ success: false, message: INCORRECTO });
    }
    if (user.INTENTOS_FALLIDOS || user.BLOQUEADO_HASTA) {
      await DatabaseManager.update('USUARIOS', user.ID_USUARIO, { INTENTOS_FALLIDOS: 0, BLOQUEADO_HASTA: null }, 'ID_USUARIO');
    }
    olvidarUsuario(user.ID_USUARIO);

    const roles = await rolesDeUsuario(user.ID_USUARIO);

    const token = jwt.sign(
      {
        id_usuario: user.ID_USUARIO,
        dni: user.DNI,
        nombres: user.NOMBRES,
        apellidos: user.APELLIDOS,
        roles: roles.map((r) => r.nombre),
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id_usuario: user.ID_USUARIO,
          nombres: user.NOMBRES,
          apellidos: user.APELLIDOS,
          email: user.EMAIL,
          dni: user.DNI,
          roles,
          requiereCambioPassword: Boolean(user.REQUIERE_CAMBIO_PASSWORD),
        },
      },
    });
  } catch (error) {
    error500(res, 'auth/login', error);
  }
}
