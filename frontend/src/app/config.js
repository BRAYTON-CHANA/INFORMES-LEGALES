const getEnvValue = (value, fallback) => value?.trim() || fallback;

/** Marca de la app (frontend/.env.local) */
export const APP_CONFIG = {
  name: getEnvValue(import.meta.env.VITE_APP_NAME, 'SIGEA'),
  fullName: getEnvValue(
    import.meta.env.VITE_APP_FULL_NAME,
    'Sistema Integrado para la Gestión y Eficiencia Administrativa'
  ),
  description: getEnvValue(
    import.meta.env.VITE_APP_DESCRIPTION,
    'Gobierno Regional de Moquegua'
  ),
  // Por defecto, frontend/public/logo.png
  logo: getEnvValue(import.meta.env.VITE_APP_LOGO, '/logo.png'),
};
