const getEnvValue = (value, fallback) => value?.trim() || fallback;

/** Marca de la app (frontend/.env.local) */
export const APP_CONFIG = {
  name: getEnvValue(import.meta.env.VITE_APP_NAME, 'Informes Legales ORAJ'),
  fullName: getEnvValue(
    import.meta.env.VITE_APP_FULL_NAME,
    'Módulo de Informes Legales — Oficina Regional de Asesoría Jurídica'
  ),
  description: getEnvValue(
    import.meta.env.VITE_APP_DESCRIPTION,
    'Gobierno Regional de Moquegua'
  ),
  // Por defecto, frontend/public/logo.png
  logo: getEnvValue(import.meta.env.VITE_APP_LOGO, '/logo.png'),
};
