import { AUTH_STORAGE_KEYS } from '@/shared/constants/authConstants';

const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    );
    const jsonPayload = decodeURIComponent(
      atob(paddedBase64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

const isTokenValid = (token) => {
  if (!token) return false;
  const decoded = decodeToken(token);
  if (!decoded || typeof decoded.exp !== 'number') return false;
  const now = Math.floor(Date.now() / 1000);
  // 30s safety margin to avoid using tokens about to expire
  return decoded.exp - 30 > now;
};

export const tokenUtils = {
  getToken: () => localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN),
  setToken: (token) => localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, token),
  removeToken: () => localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN),
  getUser: () => {
    const user = localStorage.getItem(AUTH_STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },
  setUser: (user) => localStorage.setItem(AUTH_STORAGE_KEYS.USER, JSON.stringify(user)),
  removeUser: () => localStorage.removeItem(AUTH_STORAGE_KEYS.USER),
  clear: () => {
    tokenUtils.removeToken();
    tokenUtils.removeUser();
  },
  decodeToken,
  isTokenValid
};
