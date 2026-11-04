import 'dotenv/config';

/**
 * DatabaseManager — acceso a BD independiente del motor.
 *
 * El motor se elige con DB_CLIENT=mssql|postgres (.env). La lógica común
 * (filtros, saneo, cachés) vive aquí; lo propio de cada motor está en
 * ./drivers/<motor>.js (conexión, placeholders, RETURNING/OUTPUT, paginado).
 *
 * SQL portable: identificadores en MAYÚSCULAS entre comillas dobles y todo
 * literal como parámetro (`"ACTIVO" = ?` con true, nunca `= 1` / `= TRUE`).
 * Placeholders `?` (secuencial) o `$n`.
 */
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const DB_CLIENT = (process.env.DB_CLIENT || 'postgres').toLowerCase();

/** Carga el módulo del driver (mssql o pg solo se importa si se usa) */
export async function loadDriver(client = DB_CLIENT) {
  if (client === 'mssql') return import('./drivers/mssql.js');
  if (client === 'postgres' || client === 'pg') return import('./drivers/postgres.js');
  throw new Error(`DB_CLIENT no soportado: ${client} (usa mssql o postgres)`);
}

class DatabaseManager {
  static conn = null;
  static driver = null;
  static schemaCache = {};
  static pkCache = {};

  /** Conexión singleton (pool) */
  static async connect() {
    if (!DatabaseManager.conn) {
      const driver = await loadDriver();
      DatabaseManager.conn = await driver.open(driver.configFromEnv());
      DatabaseManager.driver = driver;
    }
    return DatabaseManager.conn;
  }

  static async close() {
    if (DatabaseManager.conn) {
      await DatabaseManager.conn.close();
      DatabaseManager.conn = null;
    }
    return { closed: true };
  }

  static get dialect() {
    return DatabaseManager.driver.dialect;
  }

  /** Arrays y objetos se guardan como JSON (columnas de texto) */
  static toParam(value) {
    if (value === undefined) return null;
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      return JSON.stringify(value);
    }
    return value;
  }

  /** Strings vacíos a null, arrays/objetos a JSON */
  static sanitizeData(data) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data || {})) {
      sanitized[key] = DatabaseManager.toParam(value === '' ? null : value);
    }
    return sanitized;
  }

  static quoteField(field) {
    return IDENT.test(field) ? `"${field}"` : field;
  }

  static assertIdent(...names) {
    for (const n of names) {
      if (!IDENT.test(String(n))) throw new Error(`Identificador no válido: ${n}`);
    }
  }

  // ---------------------------------------------------------------- consultas

  /** SQL con parámetros → filas */
  static async query(sqlText, ...params) {
    const conn = await DatabaseManager.connect();
    return (await conn.run(sqlText, params.map(DatabaseManager.toParam))).rows;
  }

  /** SQL con parámetros → { rows, rowCount } */
  static async queryRaw(sqlText, ...params) {
    const conn = await DatabaseManager.connect();
    return conn.run(sqlText, params.map(DatabaseManager.toParam));
  }

  static async rawSelect(sqlText, ...params) {
    return DatabaseManager.query(sqlText, ...params);
  }

  /** Transacción: fn recibe { run(sql, params), exec(script) } */
  static async transaction(fn) {
    const conn = await DatabaseManager.connect();
    return conn.transaction(fn);
  }

  /** Varias sentencias SQL en una transacción */
  static async execute_batch_transaction(sql_statements) {
    const results = await DatabaseManager.transaction(async (tx) => {
      const out = [];
      for (const statement of sql_statements) out.push((await tx.run(statement)).rows);
      return out;
    });
    return { success: true, results };
  }

  // ------------------------------------------------------------------ esquema

  static async getTableSchema(table) {
    if (DatabaseManager.schemaCache[table]) return DatabaseManager.schemaCache[table];
    await DatabaseManager.connect();
    const rows = await DatabaseManager.query(DatabaseManager.dialect.schemaSql, table);
    const schema = {};
    for (const c of rows) schema[c.name] = { type: c.type, nullable: Number(c.nullable) === 1 };
    DatabaseManager.schemaCache[table] = schema;
    return schema;
  }

  static async getPkColumn(table) {
    if (table in DatabaseManager.pkCache) return DatabaseManager.pkCache[table];
    await DatabaseManager.connect();
    const rows = await DatabaseManager.query(DatabaseManager.dialect.pkSql, table);
    DatabaseManager.pkCache[table] = rows[0]?.col || null;
    return DatabaseManager.pkCache[table];
  }

  // ------------------------------------------------------------------ filtros

  /**
   * WHERE desde filtros: objeto { campo: valor } (igualdad, ignora vacíos)
   * o array [{ field, op, value }]. Ops: = != > < >= <= in, not in,
   * is null, is not null, like (contiene; sin distinguir mayúsculas).
   * En el array, { or: [filtrosA, filtrosB] } agrupa con OR.
   * Devuelve { where, params }.
   */
  static buildWhere(filters) {
    const clauses = [];
    const params = [];
    const p = (v) => { params.push(DatabaseManager.toParam(v)); return '?'; };

    const handle = (field, op, value) => {
      if (field === undefined) return;
      DatabaseManager.assertIdent(field);
      const opNorm = String(op ?? '=').toLowerCase().trim();
      const col = `"${field}"`;

      if (['is', 'isnull', 'is null'].includes(opNorm)) {
        clauses.push(value == null || value === 'null' ? `${col} IS NULL` : `${col} = ${p(value)}`);
        return;
      }
      if (['isnot', 'is not', 'notnull', 'not null', 'is not null'].includes(opNorm)) {
        clauses.push(value == null || value === 'null' ? `${col} IS NOT NULL` : `${col} <> ${p(value)}`);
        return;
      }
      if (value === undefined || value === null || value === '') return;

      const simple = { '=': '=', eq: '=', '!=': '<>', neq: '<>', not: '<>', '>': '>', gt: '>', '<': '<', lt: '<', '>=': '>=', gte: '>=', '<=': '<=', lte: '<=' };
      if (simple[opNorm]) {
        clauses.push(`${col} ${simple[opNorm]} ${p(value)}`);
      } else if (['in', 'not in', 'not-in', 'notin'].includes(opNorm)) {
        const values = Array.isArray(value) ? value : [value];
        if (values.length) clauses.push(`${col} ${opNorm === 'in' ? 'IN' : 'NOT IN'} (${values.map(p).join(', ')})`);
      } else if (opNorm === 'like' || opNorm === 'ilike') {
        const pattern = String(value).includes('%') ? value : `%${value}%`;
        clauses.push(`${col} ${DatabaseManager.dialect.like} ${p(pattern)}`);
      } else {
        throw new Error(`Operador no soportado: ${op}`);
      }
    };

    if (Array.isArray(filters)) {
      for (const f of filters) {
        // { or: [filtrosA, filtrosB] } → ((A) OR (B)); un grupo vacío equivale a "todo"
        if (f && Array.isArray(f.or)) {
          const grupos = f.or.map((g) => DatabaseManager.buildWhere(g));
          if (!grupos.length || grupos.some((g) => !g.where)) continue;
          clauses.push(`(${grupos.map((g) => `(${g.where.replace(/^ WHERE /, '')})`).join(' OR ')})`);
          for (const g of grupos) params.push(...g.params);
          continue;
        }
        const { field, op = '=', value } = f || {};
        handle(field, op, value);
      }
    } else if (filters && typeof filters === 'object') {
      for (const [key, value] of Object.entries(filters)) handle(key, '=', value);
    }

    return { where: clauses.length ? ' WHERE ' + clauses.join(' AND ') : '', params };
  }

  static fieldList(fields) {
    if (!Array.isArray(fields) || !fields.length) return '*';
    DatabaseManager.assertIdent(...fields);
    return fields.map((f) => `"${f}"`).join(', ');
  }

  /** "COL" o "COL DESC" → expresión ORDER BY segura */
  static orderExpr(orderBy) {
    if (!orderBy) return null;
    return String(orderBy).split(',').map((part) => {
      const [col, dir = 'ASC'] = part.trim().split(/\s+/);
      DatabaseManager.assertIdent(col);
      return `"${col}" ${dir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'}`;
    }).join(', ');
  }

  // --------------------------------------------------------------------- CRUD

  static async select(table, filters = {}, fields = null) {
    DatabaseManager.assertIdent(table);
    await DatabaseManager.connect();
    const { where, params } = DatabaseManager.buildWhere(filters);
    return DatabaseManager.query(`SELECT ${DatabaseManager.fieldList(fields)} FROM "${table}"${where}`, ...params);
  }

  static async getById(table, id, idColumn = 'id') {
    const rows = await DatabaseManager.select(table, { [idColumn]: id });
    return rows[0] || null;
  }

  static async selectWithOrderBy(table, orderBy, order = 'ASC', filters = {}, fields = null) {
    DatabaseManager.assertIdent(table);
    await DatabaseManager.connect();
    const { where, params } = DatabaseManager.buildWhere(filters);
    const orderSql = DatabaseManager.orderExpr(`${orderBy} ${order}`);
    return DatabaseManager.query(`SELECT ${DatabaseManager.fieldList(fields)} FROM "${table}"${where} ORDER BY ${orderSql}`, ...params);
  }

  static async selectWithLimit(table, limit, offset = 0, filters = {}, fields = null, orderBy = null) {
    DatabaseManager.assertIdent(table);
    await DatabaseManager.connect();
    const { where, params } = DatabaseManager.buildWhere(filters);
    const page = DatabaseManager.dialect.paginate(DatabaseManager.orderExpr(orderBy), Number(limit), Number(offset));
    return DatabaseManager.query(
      `SELECT ${DatabaseManager.fieldList(fields)} FROM "${table}"${where}${page.sql}`,
      ...params, ...page.params
    );
  }

  static async selectPaginated(table, page = 1, pageSize = 10, filters = {}, fields = null, orderBy = null) {
    return DatabaseManager.selectWithLimit(table, pageSize, (page - 1) * pageSize, filters, fields, orderBy);
  }

  static async count(table, filters = {}) {
    DatabaseManager.assertIdent(table);
    await DatabaseManager.connect();
    const { where, params } = DatabaseManager.buildWhere(filters);
    const rows = await DatabaseManager.query(`SELECT COUNT(*) AS "TOTAL" FROM "${table}"${where}`, ...params);
    return Number(rows[0]?.TOTAL || 0);
  }

  static async aggregate(table, aggregate, column, filters = {}) {
    const agg = String(aggregate).toUpperCase();
    if (!['SUM', 'AVG', 'MIN', 'MAX', 'COUNT'].includes(agg)) {
      throw new Error(`Agregado no soportado: ${aggregate}`);
    }
    DatabaseManager.assertIdent(table, column);
    await DatabaseManager.connect();
    const { where, params } = DatabaseManager.buildWhere(filters);
    const rows = await DatabaseManager.query(`SELECT ${agg}("${column}") AS "RESULT" FROM "${table}"${where}`, ...params);
    return rows[0]?.RESULT ?? 0;
  }

  /** INSERT → filas insertadas */
  static async insert(table, data) {
    return DatabaseManager.insertBatch(table, [data]);
  }

  static async insertBatch(table, dataArray) {
    if (!Array.isArray(dataArray) || !dataArray.length) return [];
    DatabaseManager.assertIdent(table);
    const conn = await DatabaseManager.connect();
    const rows = dataArray.map(DatabaseManager.sanitizeData);
    const keys = Object.keys(rows[0]);
    DatabaseManager.assertIdent(...keys);
    const pk = DatabaseManager.dialect.name === 'mssql' ? await DatabaseManager.getPkColumn(table) : null;
    return DatabaseManager.dialect.insert(conn, table, keys, rows, pk);
  }

  /** UPDATE por id → filas actualizadas */
  static async update(table, id, data, idColumn = 'id') {
    DatabaseManager.assertIdent(table, idColumn);
    const conn = await DatabaseManager.connect();
    const sanitized = DatabaseManager.sanitizeData(data);
    const keys = Object.keys(sanitized);
    if (!keys.length) return [];
    DatabaseManager.assertIdent(...keys);
    const setSql = keys.map((k) => `"${k}" = ?`).join(', ');
    return DatabaseManager.dialect.update(conn, table, setSql, `"${idColumn}" = ?`, [...keys.map((k) => sanitized[k]), id]);
  }

  static async updateBatch(table, updates, idColumn = 'id') {
    const results = [];
    for (const { id, data } of updates) results.push(await DatabaseManager.update(table, id, data, idColumn));
    return results;
  }

  static async delete(table, id, idColumn = 'id') {
    DatabaseManager.assertIdent(table, idColumn);
    await DatabaseManager.query(`DELETE FROM "${table}" WHERE "${idColumn}" = ?`, id);
    return { deleted: true };
  }

  static async deleteBatch(table, ids, idColumn = 'id') {
    const results = [];
    for (const id of ids) results.push(await DatabaseManager.delete(table, id, idColumn));
    return results;
  }

  /** UPDATE por columnas de conflicto; si no existe, INSERT */
  static async upsert(table, conflictColumns, data, conflictTarget = 'id') {
    DatabaseManager.assertIdent(table);
    const conn = await DatabaseManager.connect();
    const all = DatabaseManager.sanitizeData({ ...conflictColumns, ...data });
    const keys = Object.keys(all);
    const targets = Array.isArray(conflictTarget) ? conflictTarget : [conflictTarget];
    DatabaseManager.assertIdent(...keys, ...targets);

    const setSql = keys.map((k) => `"${k}" = ?`).join(', ');
    const whereSql = targets.map((c) => `"${c}" = ?`).join(' AND ');
    const params = [...keys.map((k) => all[k]), ...targets.map((c) => all[c] ?? null)];
    const updated = await DatabaseManager.dialect.update(conn, table, setSql, whereSql, params);
    if (updated.length) return updated;
    return DatabaseManager.insert(table, all);
  }

  static async upsertBatch(table, items, conflictTarget = 'id') {
    const results = [];
    for (const { conflictColumns, data } of items) {
      results.push(await DatabaseManager.upsert(table, conflictColumns, data, conflictTarget));
    }
    return results;
  }

  // -------------------------------------------- procedimientos / funciones SQL

  /**
   * Ejecuta un stored procedure (mssql) o función (postgres). Los parámetros
   * se mapean a p_snake_case: { idUsuario } / { ID_USUARIO } → p_id_usuario.
   * Si devuelve una sola columna JSON*, se parsea.
   */
  static async executeFunction(name, params = {}) {
    if (!/^[A-Za-z_][A-Za-z0-9_.]*$/.test(String(name))) throw new Error(`Nombre de función no válido: ${name}`);
    const conn = await DatabaseManager.connect();
    const mapped = {};
    for (const [key, value] of Object.entries(params)) {
      let snake = key.includes('_') ? key.toLowerCase() : key.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
      if (!snake.startsWith('p_')) snake = 'p_' + snake;
      DatabaseManager.assertIdent(snake);
      mapped[snake] = DatabaseManager.toParam(value);
    }
    const rows = await conn.callFunction(name, mapped);

    const cols = rows.length ? Object.keys(rows[0]) : [];
    if (cols.length === 1 && /^JSON/i.test(cols[0])) {
      const text = rows.map((r) => r[cols[0]] ?? '').join('');
      try { return typeof text === 'string' ? JSON.parse(text) : text; } catch { return text; }
    }
    return rows;
  }

  static async executeFunctionOne(name, params = {}) {
    const rows = await DatabaseManager.executeFunction(name, params);
    return Array.isArray(rows) ? rows[0] ?? null : rows;
  }

  static async listFunctions() {
    await DatabaseManager.connect();
    return (await DatabaseManager.query(DatabaseManager.dialect.listFunctionsSql)).map((r) => r.name);
  }

  static async getFunctionInfo(name) {
    await DatabaseManager.connect();
    const rows = await DatabaseManager.query(DatabaseManager.dialect.functionInfoSql, name);
    return { paramNames: rows.map((r) => r.name), params: rows };
  }
}

export default DatabaseManager;
