import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { DB_CLIENT, loadDriver } from '../lib/database/DatabaseManager.js';

/**
 * Aplica database/sql/<motor>/migrations/*.sql que no figuren en
 * SCHEMA_MIGRATIONS, cada una en su transacción. Uso: npm run db:migrate
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationDir = path.join(root, 'database', 'sql', DB_CLIENT === 'pg' ? 'postgres' : DB_CLIENT, 'migrations');

const CREATE_TABLE = {
  mssql: `IF OBJECT_ID('dbo.SCHEMA_MIGRATIONS', 'U') IS NULL
    CREATE TABLE "SCHEMA_MIGRATIONS" (
      "VERSION" NVARCHAR(255) NOT NULL PRIMARY KEY,
      "APPLIED_AT" DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    )`,
  postgres: `CREATE TABLE IF NOT EXISTS "SCHEMA_MIGRATIONS" (
      "VERSION" VARCHAR(255) NOT NULL PRIMARY KEY,
      "APPLIED_AT" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
};

async function main() {
  const files = (await fs.readdir(migrationDir, { withFileTypes: true }).catch(() => []))
    .filter((e) => e.isFile() && e.name.endsWith('.sql'))
    .map((e) => e.name)
    .sort();
  if (!files.length) {
    console.log('[db:migrate] No hay migraciones.');
    return;
  }

  const driver = await loadDriver();
  const conn = await driver.open(driver.configFromEnv());
  try {
    const core = await conn.run('SELECT COUNT(*) AS "N" FROM "USUARIOS"').catch(() => null);
    if (!core) throw new Error('El esquema base no existe: ejecuta primero npm run db:setup en una BD nueva.');

    await conn.exec(CREATE_TABLE[driver.dialect.name]);

    for (const file of files) {
      const applied = await conn.run('SELECT 1 AS "APPLIED" FROM "SCHEMA_MIGRATIONS" WHERE "VERSION" = ?', [file]);
      if (applied.rows.length) {
        console.log(`[db:migrate] ${file}: ya aplicada`);
        continue;
      }
      const script = await fs.readFile(path.join(migrationDir, file), 'utf8');
      await conn.transaction(async (tx) => {
        try {
          await tx.exec(script);
        } catch (error) {
          const line = error.lineNumber ? ` línea ${error.lineNumber}` : '';
          throw new Error(`${file}${line}: ${error.message}`);
        }
        await tx.run('INSERT INTO "SCHEMA_MIGRATIONS" ("VERSION") VALUES (?)', [file]);
      });
      console.log(`[db:migrate] ${file}: aplicada`);
    }
  } finally {
    await conn.close();
  }
}

main().catch((error) => {
  console.error('[db:migrate] Error:', error.message);
  process.exitCode = 1;
});
