import pg from 'pg';

/**
 * Driver PostgreSQL (paquete `pg`).
 *
 * .env:
 *   DB_HOST=localhost, DB_PORT=5432
 *   DB_DATABASE, DB_USER, DB_PASSWORD
 *   DB_SSL=false   (true para servicios en la nube)
 *   o bien DATABASE_URL=postgresql://... (Supabase: Session pooler), DB_POOL_MAX=5
 */

// COUNT(*) y BIGINT llegan como string: convertir a número
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => parseInt(v, 10));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => parseFloat(v));

export function configFromEnv({ database, user, password } = {}) {
  const max = parseInt(process.env.DB_POOL_MAX || '5', 10);
  // Cadena completa: Supabase (Session pooler, con SSL) o el PostgreSQL del servidor del GORE, que va
  // en la red interna de Docker sin SSL (DB_SSL=false). Sin DB_SSL: con SSL, como en Supabase
  if (process.env.DATABASE_URL && !database && !user) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
      max,
      idleTimeoutMillis: 30000,
    };
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: database ?? process.env.DB_DATABASE,
    user: user ?? process.env.DB_USER,
    password: password ?? process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max,
    idleTimeoutMillis: 30000,
  };
}

/** `?` (secuencial) → `$N`; los `$n` ya escritos se respetan */
function bind(sqlText) {
  let seq = 0;
  return sqlText.replace(/\?/g, () => `$${++seq}`);
}

function wrap(client) {
  return {
    async run(sqlText, params = []) {
      const result = await client.query(bind(sqlText), params);
      // Con varias sentencias pg devuelve un array de resultados: usar el último
      const last = Array.isArray(result) ? result[result.length - 1] : result;
      return { rows: last.rows || [], rowCount: last.rowCount ?? 0 };
    },
    /** Script completo (varias sentencias, sin parámetros) */
    async exec(scriptText) {
      if (scriptText.trim()) await client.query(scriptText);
    },
  };
}

export async function open(config) {
  const pool = new pg.Pool(config);
  // Verifica la conexión al abrir (igual que mssql)
  (await pool.connect()).release();
  return {
    ...wrap(pool),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const out = await fn(wrap(client));
        await client.query('COMMIT');
        return out;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
    /** Función con parámetros nombrados: SELECT * FROM fn(p_x => $1, ...) */
    async callFunction(name, params) {
      const keys = Object.keys(params);
      const args = keys.map((k, i) => `${k} => $${i + 1}`).join(', ');
      const result = await pool.query(`SELECT * FROM ${name}(${args})`, keys.map((k) => params[k]));
      return result.rows;
    },
    close: () => pool.end(),
  };
}

export function splitScript(text) {
  return text.trim() ? [text] : [];
}

export const dialect = {
  name: 'postgres',
  like: 'ILIKE',

  paginate(orderBy, limit, offset) {
    return {
      sql: `${orderBy ? ` ORDER BY ${orderBy}` : ''} LIMIT ? OFFSET ?`,
      params: [limit, offset],
    };
  },

  async insert(db, table, keys, rows) {
    const cols = keys.map((k) => `"${k}"`).join(', ');
    const group = `(${keys.map(() => '?').join(', ')})`;
    const values = rows.map(() => group).join(', ');
    const params = rows.flatMap((r) => keys.map((k) => r[k] ?? null));
    return (await db.run(`INSERT INTO "${table}" (${cols}) VALUES ${values} RETURNING *`, params)).rows;
  },

  async update(db, table, setSql, whereSql, params) {
    return (await db.run(`UPDATE "${table}" SET ${setSql} WHERE ${whereSql} RETURNING *`, params)).rows;
  },

  schemaSql: `
    SELECT column_name AS name, data_type AS type,
      CASE WHEN is_nullable = 'YES' THEN 1 ELSE 0 END AS nullable
    FROM information_schema.columns
    WHERE table_name = ? AND table_schema = current_schema()
    ORDER BY ordinal_position`,

  pkSql: `
    SELECT kcu.column_name AS col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.table_name = tc.table_name
    WHERE tc.table_name = ? AND tc.constraint_type = 'PRIMARY KEY'`,

  listFunctionsSql: `
    SELECT routine_name AS name FROM information_schema.routines
    WHERE routine_type = 'FUNCTION' AND routine_schema = current_schema()
    ORDER BY routine_name`,

  functionInfoSql: `
    SELECT p.parameter_name AS name, p.data_type AS type, p.parameter_mode AS mode
    FROM information_schema.parameters p
    JOIN information_schema.routines r ON r.specific_name = p.specific_name
    WHERE r.routine_name = ? AND r.routine_schema = current_schema()
    ORDER BY p.ordinal_position`,
};
