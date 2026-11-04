import { apiFetch } from '@/shared/api/apiFetch';

export const authService = {
  /** Se entra solo con el DNI */
  login: (dni, password) => apiFetch('/auth/login', { method: 'POST', body: { dni, password } }),

  verify: () => apiFetch('/auth/verify'),

  /** Solo admin: { dni, email?, nombres, apellidos?, id_roles? } → { id_usuario, dni, passwordTemporal } (clave generada, se muestra una vez) */
  register: (userData) => apiFetch('/auth/register', { method: 'POST', body: userData }),

  /** Clave propia: solo con el cambio pendiente (cuenta nueva o clave reiniciada por el admin) */
  changePassword: (newPassword) =>
    apiFetch('/auth/cambiar-password', { method: 'POST', body: { newPassword } }),

  /** Solo admin: devuelve { passwordTemporal } */
  resetPasswordAdmin: (idUsuario) =>
    apiFetch('/auth/reset-password-admin', { method: 'POST', body: { id_usuario: idUsuario } }),
};
