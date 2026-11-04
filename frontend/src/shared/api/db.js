import { apiFetch } from './apiFetch';

/**
 * CRUD genérico vía /api/execute: solo admin (Usuarios y Roles).
 * Lo que tenga reglas propias va en su endpoint.
 *
 * Filtros: { COL: valor } (igualdad) o [{ field, op, value }]
 * (op: = != > < >= <= in, not in, is null, is not null, like).
 */
export async function executeFunction(functionName, params = {}) {
  return apiFetch('/execute', { method: 'POST', body: { functionName, params } });
}

export const db = {
  select: (table, filters, fields) => executeFunction('select', { table, filters, fields }),
  getById: (table, id, idColumn) => executeFunction('getById', { table, id, idColumn }),
  insert: (table, data) => executeFunction('insert', { table, data }),
  update: (table, id, data, idColumn) => executeFunction('update', { table, id, data, idColumn }),
  delete: (table, id, idColumn) => executeFunction('delete', { table, id, idColumn }),

  insertBatch: (table, dataArray) => executeFunction('insertBatch', { table, dataArray }),
  updateBatch: (table, updates, idColumn) => executeFunction('updateBatch', { table, updates, idColumn }),
  deleteBatch: (table, ids, idColumn) => executeFunction('deleteBatch', { table, ids, idColumn }),
  upsert: (table, conflictColumns, data, conflictTarget) => executeFunction('upsert', { table, conflictColumns, data, conflictTarget }),

  selectWithOrderBy: (table, orderBy, order, filters, fields) => executeFunction('selectWithOrderBy', { table, orderBy, order, filters, fields }),
  selectPaginated: (table, page, pageSize, filters, fields, orderBy) => executeFunction('selectPaginated', { table, page, pageSize, filters, fields, orderBy }),
  count: (table, filters) => executeFunction('count', { table, filters }),
  // Sin SQL libre ni procedimientos: lo que necesite JOINs va en un endpoint propio
};

export default db;
