/**
 * URL base de la API.
 * - En dev: el proxy de Vite redirige /api → http://localhost:3001
 * - En producción con Express sirviendo dist/: '/api' (mismo origen)
 * - API en otro dominio: VITE_API_URL=https://api.midominio.com/api
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
