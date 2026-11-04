import { useState, useCallback } from 'react';
import { authService } from '@/features/login/services/authService';
import { tokenUtils } from '@/shared/utils/tokenUtils';

const rolNombre = (r) => (typeof r === 'string' ? r : r?.nombre);

/** Estado de sesión (token + usuario en localStorage). Usar vía useAuthContext(). */
export const useAuth = () => {
  const [token, setToken] = useState(() => {
    const t = tokenUtils.getToken();
    if (!tokenUtils.isTokenValid(t)) {
      tokenUtils.clear();
      return null;
    }
    return t;
  });
  const [user, setUser] = useState(() => (token ? tokenUtils.getUser() : null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (dni, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(dni, password);
      tokenUtils.setToken(data.token);
      tokenUtils.setUser(data.user);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    tokenUtils.clear();
    setToken(null);
    setUser(null);
  }, []);

  /** Actualiza campos del usuario guardado (p. ej. tras cambiar la clave) */
  const patchUser = useCallback((cambios) => {
    setUser((prev) => {
      const next = { ...prev, ...cambios };
      tokenUtils.setUser(next);
      return next;
    });
  }, []);

  const roles = (user?.roles || []).map(rolNombre).filter(Boolean);

  return {
    user,
    token,
    roles,
    isAdmin: roles.includes('admin'),
    isAuthenticated: tokenUtils.isTokenValid(token),
    loading,
    error,
    login,
    logout,
    patchUser,
  };
};
