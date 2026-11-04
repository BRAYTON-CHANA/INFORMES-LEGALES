import DatabaseManager from '../lib/database/DatabaseManager.js';
import { withAdmin, olvidarUsuario } from '../lib/middleware/auth.js';
import { cors, soloMetodo, error500 } from '../lib/shared/http.js';

/**
 * CRUD genérico: POST { functionName, params } → DatabaseManager[functionName].
 * Solo admin (Usuarios y Roles): los métodos CRUD sobre tablas y vistas, nunca SQL libre
 * ni procedimientos. Abogados y consulta usan los endpoints de su módulo.
 * Lo que necesite JOINs va en una vista; lo que tenga reglas, en un endpoint propio.
 */
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Métodos que nunca se exponen: internos, SQL libre y procedimientos (un token de
// admin robado no debe poder ejecutar cualquier SQL)
const BLOQUEADOS = new Set([
  'connect', 'close', 'transaction', 'loadDriver', 'assertIdent', 'buildWhere',
  'query', 'queryRaw', 'rawSelect', 'execute_batch_transaction',
  'executeFunction', 'executeFunctionOne', 'listFunctions', 'getFunctionInfo',
  'getTableSchema', 'getPkColumn', 'toParam', 'sanitizeData', 'quoteField', 'fieldList', 'orderExpr',
]);
const ESCRITURA = new Set(['insert', 'insertBatch', 'update', 'updateBatch', 'delete', 'deleteBatch', 'upsert', 'upsertBatch']);
// Tablas con endpoint propio (reglas, validaciones y bitácora; nada se borra): sin escritura directa, ni para admin
const SOLO_POR_ENDPOINT = /^(INFORMES|INFORME_\w+|TIPOS_DOCUMENTO|MATERIAS|NORMAS|AREAS|UNIDADES_EJECUTORAS)$/;

async function handler(req, res) {
  if (cors(req, res)) return;
  if (!soloMetodo(req, res, 'POST')) return;

  const { functionName } = req.body || {};
  const params = req.body?.params || {};

  try {
    const func = typeof functionName === 'string' && /^[A-Za-z_]+$/.test(functionName) && !BLOQUEADOS.has(functionName)
      ? DatabaseManager[functionName]
      : null;
    if (typeof func !== 'function') {
      return res.status(400).json({ success: false, message: `Función ${functionName} no existe` });
    }

    if (!IDENT.test(String(params.table || ''))) {
      return res.status(400).json({ success: false, message: 'Parámetros no válidos' });
    }
    if (ESCRITURA.has(functionName) && SOLO_POR_ENDPOINT.test(String(params.table).toUpperCase())) {
      return res.status(403).json({ success: false, message: 'Esta tabla se modifica desde su módulo (/api/informes o /api/catalogos)' });
    }
    // Filtros en array solo con '=' → objeto plano
    if (Array.isArray(params.filters) && params.filters.every((f) => f.op === '=' || f.op === undefined)) {
      params.filters = Object.fromEntries(params.filters.map((f) => [f.field, f.value]));
    }

    const result = await func(...Object.values(params));
    // Cambios en usuarios o roles: que la sesión los tome de inmediato
    if (ESCRITURA.has(functionName) && ['USUARIOS', 'USUARIO_ROL', 'ROLES'].includes(String(params.table).toUpperCase())) {
      olvidarUsuario();
    }
    res.json({ success: true, data: result });
  } catch (error) {
    error500(res, `execute/${functionName}`, error);
  }
}

export default withAdmin(handler);
