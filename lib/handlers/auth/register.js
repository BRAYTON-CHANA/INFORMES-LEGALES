import DatabaseManager from '../../database/DatabaseManager.js';
import bcrypt from 'bcryptjs';
import { withAdmin } from '../../middleware/auth.js';
import { soloMetodo, error500 } from '../../shared/http.js';
import { credencialNueva, claveTemporal } from '../../config/credenciales.js';

/**
 * POST { dni, email?, nombres, apellidos?, id_roles? } — solo admin.
 * Se entra con el DNI (lib/config/credenciales.js). La clave la genera el sistema (claveTemporal), se
 * devuelve UNA vez para que el admin la entregue y el usuario debe cambiarla al entrar.
 */
async function handler(req, res) {
  if (!soloMetodo(req, res, 'POST')) return;

  const { nombres, apellidos, id_roles } = req.body || {};
  const cred = credencialNueva(req.body || {});
  if (cred.error) return res.status(400).json({ success: false, message: cred.error });
  const { dni, email } = cred;

  if (!nombres) return res.status(400).json({ success: false, message: 'Los nombres son obligatorios' });

  try {
    const existing = await DatabaseManager.query(
      `SELECT "ID_USUARIO" FROM "USUARIOS"
       WHERE "DNI" = ? OR ("EMAIL" IS NOT NULL AND "EMAIL" = ?)`,
      dni, email
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'Ya existe un usuario con ese DNI o email' });
    }
    const password = claveTemporal();
    const passwordHash = await bcrypt.hash(password, 10);
    const rolesList = Array.isArray(id_roles) ? id_roles.map(Number).filter(Boolean) : [];

    const idUsuario = await DatabaseManager.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO "USUARIOS" ("NOMBRES", "APELLIDOS", "EMAIL", "DNI", "PASSWORD_HASH", "ACTIVO", "REQUIERE_CAMBIO_PASSWORD")
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nombres, apellidos || null, email, dni, passwordHash, true, true]
      );
      const { rows } = await tx.run('SELECT "ID_USUARIO" FROM "USUARIOS" WHERE "DNI" = ?', [dni]);
      const id = rows[0]?.ID_USUARIO;
      if (!id) throw new Error('No se pudo registrar el usuario');

      for (const idRol of rolesList) {
        await tx.run(
          'INSERT INTO "USUARIO_ROL" ("ID_USUARIO", "ID_ROL", "ASIGNADO_POR") VALUES (?, ?, ?)',
          [id, idRol, req.user.id_usuario]
        );
      }
      return id;
    });

    // La clave temporal solo viaja en esta respuesta: no se guarda en claro en ningún lado
    res.json({ success: true, data: { id_usuario: idUsuario, dni, passwordTemporal: password } });
  } catch (error) {
    error500(res, 'auth/register', error);
  }
}

export default withAdmin(handler);
