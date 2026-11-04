import sql from 'mssql';

/**
 * Driver SQL Server (paquete `mssql`).
 *
 * .env:
 *   DB_HOST=localhost
 *   DB_INSTANCE=SQLEXPRESS   (o DB_PORT=1433 para puerto fijo)
 *   DB_DATABASE, DB_USER, DB_PASSWORD
 *   DB_ENCRYPT=false, DB_TRUST_SERVER_CERT=true
 */

export function configFromEnv({ database, user, password } = {}) {
  const config = {
    server: process.env.DB_HOST || 'localhost',
    database: database ?? process.env.DB_DATABASE,
    user: user ?? process.env.DB_USER,
    password: password ?? process.env.DB_PASSWORD,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== 'false',
      enableArithAbort: true,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  };
  if (process.env.DB_PORT) {
    config.port = parseInt(process.env.DB_PORT, 10);
  } else {
    config.options.instanceName = process.env.DB_INSTANCE || 'SQLEXPRESS';
  }
  return config;
}

/** `?` (secuencial) y `$n` → `@pN` */
function bind(request, sqlText, params) {
  let seq = 0;
  const finalSql = sqlText.replace(/\$(\d+)|\?/g, (match, num) => {
    const idx = num ? parseInt(num, 10) - 1 : seq++;
    return `@p${idx + 1}`;
  });
  params.forEach((value, i) => request.input(`p${i + 1}`, value));
  return finalSql;
}

function wrap(target) {
  return {
    async run(sqlText, params = []) {
      const request = new sql.Request(target);
      const result = await request.query(bind(request, sqlText, params));
      return { rows: result.recordset || [], rowCount: result.rowsAffected?.[0] ?? 0 };
    },
    /** Script con varias sentencias y lotes separados por GO */
    async exec(scriptText) {
      for (const batch of splitScript(scriptText)) {
        await new sql.Request(target).batch(batch);
      }
    },
  };
}

export async function open(config) {
  const pool = await new sql.ConnectionPool(config).connect();
  return {
    ...wrap(pool),
    async transaction(fn) {
      const tx = new sql.Transaction(pool);
      await tx.begin();
      try {
        const out = await fn(wrap(tx));
        await tx.commit();
        return out;
      } catch (err) {
        try { await tx.rollback(); } catch { /* ya revertida */ }
        throw err;
      }
    },
    /** Stored procedure con params @p_snake_case */
    async callFunction(name, params) {
      const request = pool.request();
      for (const [key, value] of Object.entries(params)) request.input(key, value);
      const result = await request.execute(name);
      return result.recordset || [];
    },
    close: () => pool.close(),
  };
}

export function splitScript(text) {
  return text.split(/^\s*GO\s*$/gim).map((b) => b.trim()).filter(Boolean);
}

export const dialect = {
  name: 'mssql',
  like: 'LIKE',

  paginate(orderBy, limit, offset) {
    return {
      sql: ` ORDER BY ${orderBy || '(SELECT NULL)'} OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
      params: [offset, limit],
    };
  },

  /**
   * INSERT que devuelve las filas. SQL Server no permite `OUTPUT INSERTED`
   * sin INTO en tablas con trigger: en ese caso inserta fila por fila y las
   * recupera con SCOPE_IDENTITY().
   */
  async insert(db, table, keys, rows, pk) {
    const cols = keys.map((k) => `"${k}"`).join(', ');
    const group = `(${keys.map(() => '?').join(', ')})`;
    const params = rows.flatMap((r) => keys.map((k) => r[k] ?? null));
    try {
      const values = rows.map(() => group).join(', ');
      return (await db.run(`INSERT INTO "${table}" (${cols}) OUTPUT INSERTED.* VALUES ${values}`, params)).rows;
    } catch (err) {
      if (!isOutputTriggerError(err)) throw err;
      const out = [];
      const sel = pk ? `; SELECT * FROM "${table}" WHERE "${pk}" = CAST(SCOPE_IDENTITY() AS INT)` : '';
      for (const r of rows) {
        out.push(...(await db.run(`INSERT INTO "${table}" (${cols}) VALUES ${group}${sel}`, keys.map((k) => r[k] ?? null))).rows);
      }
      return out;
    }
  },

  /** UPDATE que devuelve las filas (mismo fallback por triggers) */
  async update(db, table, setSql, whereSql, params) {
    try {
      return (await db.run(`UPDATE "${table}" SET ${setSql} OUTPUT INSERTED.* WHERE ${whereSql}`, params)).rows;
    } catch (err) {
      if (!isOutputTriggerError(err)) throw err;
      await db.run(`UPDATE "${table}" SET ${setSql} WHERE ${whereSql}`, params);
      const nSet = (setSql.match(/\?/g) || []).length;
      return (await db.run(`SELECT * FROM "${table}" WHERE ${whereSql}`, params.slice(nSet))).rows;
    }
  },

  schemaSql: `
    SELECT c.COLUMN_NAME AS name, c.DATA_TYPE AS type,
      CASE WHEN c.IS_NULLABLE = 'YES' THEN 1 ELSE 0 END AS nullable
    FROM INFORMATION_SCHEMA.COLUMNS c
    WHERE c.TABLE_NAME = ? AND c.TABLE_SCHEMA = 'dbo'
    ORDER BY c.ORDINAL_POSITION`,

  pkSql: `
    SELECT kcu.COLUMN_NAME AS col
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
    JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME AND kcu.TABLE_NAME = tc.TABLE_NAME
    WHERE tc.TABLE_NAME = ? AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'`,

  listFunctionsSql: `
    SELECT ROUTINE_NAME AS name FROM INFORMATION_SCHEMA.ROUTINES
    WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_SCHEMA = 'dbo'
    ORDER BY ROUTINE_NAME`,

  functionInfoSql: `
    SELECT PARAMETER_NAME AS name, DATA_TYPE AS type, PARAMETER_MODE AS mode
    FROM INFORMATION_SCHEMA.PARAMETERS
    WHERE SPECIFIC_NAME = ? AND SPECIFIC_SCHEMA = 'dbo'
    ORDER BY ORDINAL_POSITION`,
};

function isOutputTriggerError(err) {
  return String(err?.message || '').includes('enabled triggers');
}
