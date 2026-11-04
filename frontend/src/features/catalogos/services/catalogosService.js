import { apiFetch } from '@/shared/api';

/** API de catálogos con validación (lib/handlers/catalogos.js). Sin borrado: se desactiva. */
export const catalogosService = {
  listar: (clave, { inactivos = false } = {}) => apiFetch(`/catalogos/${clave}${inactivos ? '?inactivos=1' : ''}`),
  crear: (clave, datos) => apiFetch(`/catalogos/${clave}`, { method: 'POST', body: datos }),
  actualizar: (clave, id, datos) => apiFetch(`/catalogos/${clave}/${id}`, { method: 'PUT', body: datos }),
  activar: (clave, id, activo) => apiFetch(`/catalogos/${clave}/${id}/activo`, { method: 'POST', body: { activo } }),
};
