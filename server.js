import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import executeHandler from './api/execute.js';
import healthHandler from './api/health.js';
import authHandler from './api/auth/[...path].js';
import informesHandler from './api/informes/[...path].js';
import catalogosHandler from './api/catalogos/[...path].js';
import DatabaseManager, { DB_CLIENT } from './lib/database/DatabaseManager.js';
import { origenesCors } from './lib/shared/http.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.JWT_SECRET) {
  console.error('[server] Falta JWT_SECRET en .env');
  process.exit(1);
}

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
app.disable('x-powered-by');
// Detrás del balanceador de Cloud Run: req.ip / req.secure salen de x-forwarded-*
app.set('trust proxy', parseInt(process.env.TRUST_PROXY || '1', 10));

// Cabeceras de seguridad (sin dependencias). La CSP aplica al frontend servido
// desde frontend/dist; en desarrollo la página la sirve Vite.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Content-Security-Policy', CSP);
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  }
  if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
// CORS solo si el frontend vive en otro dominio (CORS_ORIGIN). Por defecto, mismo
// origen: en desarrollo el proxy de Vite reenvía /api, así que no hace falta.
if (origenesCors().length) app.use(cors({ origin: origenesCors() }));

// Rutas API (handlers estilo Vercel: (req, res) con res.status().json()).
// Con app.use, dentro del handler req.url ya viene sin el prefijo.
app.all('/api/execute', executeHandler);
app.all('/api/health', healthHandler);
app.use('/api/auth', authHandler);
app.use('/api/informes', informesHandler);
app.use('/api/catalogos', catalogosHandler);

// 404 para rutas /api desconocidas
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// En producción, servir el build del frontend si existe
const distDir = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Manejador de errores global
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error('[server] Error no manejado:', err);
  // 4xx (p. ej. JSON mal formado) con un mensaje simple; 500 sin detalles internos
  res.status(status).json({ success: false, message: status === 500 ? 'Error interno del servidor' : 'Solicitud no válida' });
});

app.listen(PORT, () => {
  console.log(`[server] API en http://localhost:${PORT} (BD: ${DB_CLIENT})`);
  console.log(`[server] Health check: http://localhost:${PORT}/api/health`);
});

// Cierre limpio del pool
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await DatabaseManager.close().catch(() => {});
    process.exit(0);
  });
}
