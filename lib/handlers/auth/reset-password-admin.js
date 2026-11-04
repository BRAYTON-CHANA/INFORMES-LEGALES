import DatabaseManager from '../../database/DatabaseManager.js';
import bcrypt from 'bcryptjs';
import { withAdmin, olvidarUsuario } from '../../middleware/auth.js';
import { soloMetodo, error500 } from '../../shared/http.js';
import { claveTemporal } from '../../config/credenciales.js';

/**
 * Pone una clave temporal al azar, desbloquea la cuenta y obliga a cambiarla en el
 * próximo ingreso. Devuelve la clave (se muestra una sola vez). También la usa
 * scripts/reiniciar-clave.js cuando el propio admin pierde su clave.
 */
export async function reiniciarClave(idUsuario) {
  const temporal = claveTemporal();
  await DatabaseManager.update('USUARIOS', idUsuario, {
    PASSWORD_HASH: await bcrypt.hash(temporal, 10),
    REQUIERE_CAMBIO_PASSWORD: true,
    INTENTOS_FALLIDOS: 0,
    BLOQUEADO_HASTA: null,
    FECHA_EDICION: new Date(),
  }, 'ID_USUARIO');
  olvidarUsuario(idUsuario);
  return temporal;
}

/** POST { id_usuario } — solo admin: reinicia la contraseña y devuelve la temporal una sola vez */
async function handler(req, res) {
  if (!soloMetodo(req, res, 'POST')) return;

  const idUsuario = Number(req.body?.id_usuario);
  if (!idUsuario) return res.status(400).json({ success: false, message: 'id_usuario es obligatorio' });

  try {
    const user = await DatabaseManager.getById('USUARIOS', idUsuario, 'ID_USUARIO');
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    res.json({ success: true, data: { passwordTemporal: await reiniciarClave(idUsuario) } });
  } catch (error) {
    error500(res, 'auth/reset-password-admin', error);
  }
}

export default withAdmin(handler);
