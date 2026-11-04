import DatabaseManager from '../../database/DatabaseManager.js';
import bcrypt from 'bcryptjs';
import { withAuth, olvidarUsuario } from '../../middleware/auth.js';
import { soloMetodo, error500 } from '../../shared/http.js';

/** null si la clave sirve; mensaje de error en caso contrario */
export function validarPassword(password, dni) {
  if (typeof password !== 'string' || password.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (dni && password === String(dni)) return 'La contraseña no puede ser igual al DNI';
  return null;
}

/**
 * POST { newPassword } — el usuario pone su clave, solo cuando tiene el cambio pendiente
 * (cuenta nueva o clave reiniciada por el admin). Fuera de ese caso, la reinicia el admin.
 */
async function handler(req, res) {
  if (!soloMetodo(req, res, 'POST')) return;

  const { newPassword } = req.body || {};
  const errorClave = validarPassword(newPassword, req.user.dni);
  if (errorClave) return res.status(400).json({ success: false, message: errorClave });

  try {
    const user = await DatabaseManager.getById('USUARIOS', req.user.id_usuario, 'ID_USUARIO');
    if (!user || !user.ACTIVO) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    if (!user.REQUIERE_CAMBIO_PASSWORD) {
      return res.status(403).json({ success: false, message: 'Pide al administrador que reinicie tu contraseña' });
    }

    await DatabaseManager.update('USUARIOS', user.ID_USUARIO, {
      PASSWORD_HASH: await bcrypt.hash(newPassword, 10),
      REQUIERE_CAMBIO_PASSWORD: false,
      FECHA_EDICION: new Date(),
    }, 'ID_USUARIO');

    olvidarUsuario(user.ID_USUARIO);
    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    error500(res, 'auth/cambiar-password', error);
  }
}

export default withAuth(handler, { permitirCambioPendiente: true });
