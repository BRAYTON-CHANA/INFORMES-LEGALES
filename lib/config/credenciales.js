import 'dotenv/config';
import crypto from 'crypto';

/**
 * Credenciales institucionales: ÚNICO lugar que decide cómo se identifican los usuarios.
 * Se entra solo con el DNI (8 dígitos) y la clave; el email es un dato de contacto opcional.
 */

/** Intentos fallidos seguidos antes de bloquear y minutos de bloqueo */
export const MAX_INTENTOS = Number(process.env.LOGIN_MAX_INTENTOS || 5);
export const MINUTOS_BLOQUEO = Number(process.env.LOGIN_MINUTOS_BLOQUEO || 15);

export const esDni = (v) => /^\d{8}$/.test(String(v || ''));

// Sin caracteres que se confunden al copiarlos a mano (0/O, 1/l/I)
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/** Clave temporal al azar (la pone el admin al reiniciar; se cambia al entrar) */
export const claveTemporal = (largo = 10) =>
  Array.from({ length: largo }, () => ALFABETO[crypto.randomInt(ALFABETO.length)]).join('');

/**
 * Valida y normaliza los datos de identificación de un usuario nuevo.
 * Devuelve { error } o { dni, email } listos para guardar.
 */
export function credencialNueva({ dni, email }) {
  const d = String(dni || '').trim();
  if (!esDni(d)) return { error: 'El DNI es obligatorio (8 dígitos)' };
  return { dni: d, email: String(email || '').trim().toLowerCase() || null };
}
