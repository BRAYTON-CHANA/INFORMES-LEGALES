#!/usr/bin/env node
import 'dotenv/config';
import DatabaseManager from '../lib/database/DatabaseManager.js';
import { esDni } from '../lib/config/credenciales.js';
import { reiniciarClave } from '../lib/handlers/auth/reset-password-admin.js';

/**
 * Reinicia la contraseña de una cuenta por su DNI y muestra la clave temporal (una sola vez).
 * Para cuando el propio admin pierde su clave; el resto se reinicia desde Configuración → Usuarios.
 * Uso: npm run admin:reiniciar-clave -- 12345678
 */
const dni = String(process.argv[2] || '').trim();

try {
  if (!esDni(dni)) throw new Error('Indica el DNI (8 dígitos): npm run admin:reiniciar-clave -- 12345678');
  const [user] = await DatabaseManager.select('USUARIOS', { DNI: dni }, ['ID_USUARIO', 'NOMBRES', 'APELLIDOS', 'ACTIVO']);
  if (!user) throw new Error(`No hay ninguna cuenta con el DNI ${dni}`);

  const temporal = await reiniciarClave(user.ID_USUARIO);
  console.log(`\nCuenta: ${[user.NOMBRES, user.APELLIDOS].filter(Boolean).join(' ')} (DNI ${dni})${user.ACTIVO ? '' : ' — INACTIVA'}`);
  console.log(`Clave temporal: ${temporal}`);
  console.log('Entra con el DNI y esta clave; el sistema pedirá poner una nueva.\n');
  process.exit(0);
} catch (error) {
  console.error('[reiniciar-clave]', error.message);
  process.exit(1);
}
