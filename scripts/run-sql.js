import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { DB_CLIENT, loadDriver } from '../lib/database/DatabaseManager.js';
import { DESTINO, asegurarBucket } from '../lib/storage/archivos.js';

/**
 * Ejecuta los scripts de database/sql/<motor>/ en orden (motor = DB_CLIENT).
 *
 *   setup        → solo si hay DB_ADMIN_USER/DB_ADMIN_PASSWORD: crea BD y usuario
 *                  (mssql: setup/*.sql contra master; postgres: desde aquí)
 *   tables, seeds, views, triggers, procedures, indexes, (otras, alfabético)
 *   migrations   → NO (es para BD con datos: npm run db:migrate)
 *
 * Placeholders {{DB_DATABASE}}, {{DB_USER}}, {{DB_PASSWORD}} se reemplazan
 * desde .env. Al final crea el usuario admin (ADMIN_DNI/ADMIN_PASSWORD).
 *
 * Uso: npm run db:setup
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_DIR = path.join(__dirname, '..', 'database', 'sql', DB_CLIENT === 'pg' ? 'postgres' : DB_CLIENT);
const FOLDER_ORDER = ['tables', 'seeds', 'views', 'triggers', 'procedures', 'indexes'];
const SKIP = new Set(['setup', 'migrations']);
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function substitute(text) {
  return text
    .replaceAll('{{DB_DATABASE}}', process.env.DB_DATABASE || '')
    .replaceAll('{{DB_USER}}', process.env.DB_USER || '')
    .replaceAll('{{DB_PASSWORD}}', (process.env.DB_PASSWORD || '').replaceAll("'", "''"));
}

async function listSqlFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile() && e.name.endsWith('.sql')).map((e) => path.join(dir, e.name)).sort();
  } catch {
    return [];
  }
}

async function runScript(conn, filePath) {
  console.log(`  ${path.relative(SQL_DIR, filePath)}`);
  await conn.exec(substitute(await fs.readFile(filePath, 'utf8')));
}

/** Crea BD y usuario como administrador (opcional) */
async function setup(driver) {
  const adminUser = process.env.DB_ADMIN_USER;
  const adminPassword = process.env.DB_ADMIN_PASSWORD;
  if (process.env.DATABASE_URL && driver.dialect.name !== 'mssql') {
    console.log('[run-sql] DATABASE_URL (Supabase): la BD ya existe, no se crea BD ni usuario.');
    return;
  }
  if (!adminUser || !adminPassword) {
    console.log('[run-sql] DB_ADMIN_USER/DB_ADMIN_PASSWORD no configurados: la BD y el usuario deben existir ya.');
    return;
  }

  const { DB_DATABASE: db, DB_USER: user, DB_PASSWORD: pass = '' } = process.env;
  if (!IDENT.test(db || '') || !IDENT.test(user || '')) {
    throw new Error('DB_DATABASE y DB_USER deben ser identificadores simples (letras, números, _)');
  }

  if (driver.dialect.name === 'mssql') {
    console.log(`[run-sql] Conectando a master como ${adminUser}...`);
    const admin = await driver.open(driver.configFromEnv({ database: 'master', user: adminUser, password: adminPassword }));
    for (const file of await listSqlFiles(path.join(SQL_DIR, 'setup'))) await runScript(admin, file);
    await admin.close();
  } else {
    console.log(`[run-sql] Conectando a postgres como ${adminUser}...`);
    const admin = await driver.open(driver.configFromEnv({ database: 'postgres', user: adminUser, password: adminPassword }));
    const lit = `'${pass.replaceAll("'", "''")}'`;
    const role = await admin.run('SELECT 1 FROM pg_roles WHERE rolname = ?', [user]);
    await admin.exec(role.rows.length
      ? `ALTER ROLE "${user}" WITH LOGIN PASSWORD ${lit}`
      : `CREATE ROLE "${user}" WITH LOGIN PASSWORD ${lit}`);
    const exists = await admin.run('SELECT 1 FROM pg_database WHERE datname = ?', [db]);
    if (!exists.rows.length) await admin.exec(`CREATE DATABASE "${db}" OWNER "${user}"`);
    await admin.close();
  }
  console.log('[run-sql] Base de datos y usuario listos');
}

/** Vistas con `*` fijan sus columnas al crearse: refrescarlas (solo mssql) */
async function refreshViews(conn) {
  const { rows } = await conn.run(`
    SELECT QUOTENAME(SCHEMA_NAME(v."schema_id")) + '.' + QUOTENAME(v."name") AS "NOMBRE"
    FROM sys.views v WHERE OBJECTPROPERTY(v."object_id", 'IsSchemaBound') = 0`);
  for (const { NOMBRE } of rows) {
    await conn.run('EXEC sp_refreshview ?', [NOMBRE]).catch((err) => {
      console.warn(`  No se pudo refrescar ${NOMBRE}: ${err.message}`);
    });
  }
  if (rows.length) console.log(`  ${rows.length} vista(s) refrescada(s)`);
}

/**
 * tables/ ya trae el esquema final: en una BD nueva las migraciones existentes se dan por
 * aplicadas para que db:migrate no las vuelva a correr (solo postgres; idempotente).
 */
async function marcarMigraciones(conn) {
  await conn.exec(`CREATE TABLE IF NOT EXISTS "SCHEMA_MIGRATIONS" (
      "VERSION" VARCHAR(255) NOT NULL PRIMARY KEY,
      "APPLIED_AT" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE "SCHEMA_MIGRATIONS" ENABLE ROW LEVEL SECURITY`);
  const files = (await listSqlFiles(path.join(SQL_DIR, 'migrations'))).map((f) => path.basename(f));
  for (const file of files) {
    await conn.run('INSERT INTO "SCHEMA_MIGRATIONS" ("VERSION") VALUES (?) ON CONFLICT DO NOTHING', [file]);
  }
  if (files.length) console.log(`  ${files.length} migración(es) marcadas como aplicadas`);
}

async function seedAdmin(conn) {
  const dni = String(process.env.ADMIN_DNI || '').trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !/^\d{8}$/.test(dni)) {
    console.log('[run-sql] ADMIN_DNI (8 dígitos) o ADMIN_PASSWORD no configurados: no se crea el usuario admin.');
    return;
  }

  const existing = await conn.run('SELECT "ID_USUARIO" FROM "USUARIOS" WHERE "DNI" = ?', [dni]);
  if (existing.rows.length) {
    console.log(`  Usuario admin (DNI ${dni}) ya existe`);
    return;
  }

  await conn.run(
    `INSERT INTO "USUARIOS" ("DNI", "NOMBRES", "APELLIDOS", "PASSWORD_HASH", "ACTIVO", "REQUIERE_CAMBIO_PASSWORD")
     VALUES (?, ?, ?, ?, ?, ?)`,
    [dni, 'Administrador', null, await bcrypt.hash(password, 10), true, true]
  );
  await conn.run(
    `INSERT INTO "USUARIO_ROL" ("ID_USUARIO", "ID_ROL")
     SELECT u."ID_USUARIO", r."ID_ROL" FROM "USUARIOS" u, "ROLES" r
     WHERE u."DNI" = ? AND r."NOMBRE_ROL" = ?`,
    [dni, 'admin']
  );
  console.log(`  Usuario admin creado: DNI ${dni} (deberá cambiar la clave al entrar)`);
}

async function main() {
  const driver = await loadDriver();
  console.log(`[run-sql] Motor: ${driver.dialect.name} · scripts: ${path.relative(process.cwd(), SQL_DIR)}`);

  await setup(driver);

  console.log(process.env.DATABASE_URL && driver.dialect.name !== 'mssql'
    ? '[run-sql] Conectando por DATABASE_URL...'
    : `[run-sql] Conectando a ${process.env.DB_DATABASE} como ${process.env.DB_USER}...`);
  const conn = await driver.open(driver.configFromEnv());

  const entries = await fs.readdir(SQL_DIR, { withFileTypes: true });
  const extra = entries.filter((e) => e.isDirectory() && !SKIP.has(e.name) && !FOLDER_ORDER.includes(e.name)).map((e) => e.name).sort();
  for (const dir of [...FOLDER_ORDER, ...extra]) {
    for (const file of await listSqlFiles(path.join(SQL_DIR, dir))) await runScript(conn, file);
  }

  if (driver.dialect.name === 'mssql') await refreshViews(conn);
  else await marcarMigraciones(conn);
  await seedAdmin(conn);

  await conn.close();

  // PDF: bucket privado de Supabase, carpeta del servidor (ARCHIVOS_DIR) o la BD (ver lib/storage/archivos.js)
  const estado = await asegurarBucket();
  console.log(`  PDF en ${DESTINO}${estado ? `: ${estado}` : ''}`);
  console.log('[run-sql] Listo.');
}

main().catch((err) => {
  console.error('[run-sql] Error:', err.message);
  if (DB_CLIENT === 'mssql' && (err.code === 'ESOCKET' || err.message.includes('instance'))) {
    console.error('[run-sql] No se pudo conectar a SQL Server. ¿Está activo el servicio y SQL Server Browser');
    console.error('[run-sql] (instancia nombrada) o el puerto TCP (DB_PORT)?');
  }
  process.exit(1);
});
