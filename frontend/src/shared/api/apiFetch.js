import { API_BASE_URL } from '@/shared/config/api';
import { tokenUtils } from '@/shared/utils/tokenUtils';

/**
 * Wrapper de fetch para la API:
 * - Inyecta Authorization: Bearer <token> desde localStorage
 * - Parsea { success, data, message } y lanza Error unificado
 * - En 401 con sesión abierta limpia la sesión y recarga (páginas públicas → visitante)
 */
export async function apiFetch(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const token = tokenUtils.getToken();

  const finalHeaders = { ...headers };
  if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : (body instanceof FormData ? body : JSON.stringify(body)),
  });

  if (raw) return response;

  let result;
  try {
    result = await response.json();
  } catch {
    result = { success: false, message: `Error ${response.status}` };
  }

  // Sesión vencida: en páginas públicas (repositorio) se recarga como visitante;
  // en las de la ORAJ, ProtectedRoute manda al login y vuelve aquí al entrar
  if (response.status === 401 && token) {
    tokenUtils.clear();
    if (!window.location.pathname.startsWith('/login')) {
      sessionStorage.setItem('redirect_after_login', window.location.pathname);
      window.location.reload();
    }
    throw new Error(result.message || 'Sesión expirada');
  }

  // La API exige el cambio de clave pendiente antes de cualquier otra operación
  if (response.status === 403 && result.code === 'CAMBIO_PASSWORD') {
    const user = tokenUtils.getUser();
    if (user) tokenUtils.setUser({ ...user, requiereCambioPassword: true });
    if (!window.location.pathname.startsWith('/cambiar-contrasena')) window.location.href = '/cambiar-contrasena';
  }

  if (!result.success) {
    const error = new Error(result.message || `Error ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return result.data;
}

export default apiFetch;
