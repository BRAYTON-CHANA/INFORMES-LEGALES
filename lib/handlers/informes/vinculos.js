import DatabaseManager from '../../database/DatabaseManager.js';
import { normalizar } from './indice.js';

/**
 * Sistematización: normativa asociada a cada informe (INFORME_NORMAS).
 * Se guarda el texto de la norma: el catálogo NORMAS solo sugiere al escribir y una
 * norma que no está se escribe a mano, sin agregarla al catálogo.
 */

/**
 * Lee del body NORMAS: [{ NORMA, ARTICULOS? }].
 * Si no viene, queda undefined (no se toca lo guardado).
 */
export function leerVinculos(body = {}) {
  const v = {};
  if (Array.isArray(body.NORMAS)) {
    v.normas = body.NORMAS
      .map((n) => ({
        NORMA: String(n?.NORMA || '').trim().replace(/\s+/g, ' ').slice(0, 500),
        ARTICULOS: String(n?.ARTICULOS || '').trim().slice(0, 300) || null,
      }))
      .filter((n) => n.NORMA);
  }
  return v;
}

export async function validarVinculos(v) {
  if (v.normas && new Set(v.normas.map((n) => normalizar(n.NORMA))).size !== v.normas.length) {
    return 'Una norma está repetida';
  }
  return null;
}

/** Normas para armar TEXTO_BUSQUEDA: las nuevas o las ya guardadas */
export async function normasParaTexto(v, idInforme) {
  const filas = v.normas ?? (idInforme ? await DatabaseManager.select('INFORME_NORMAS', { ID_INFORME: idInforme }, ['NORMA', 'ARTICULOS']) : []);
  return filas.flatMap((n) => [n.NORMA, n.ARTICULOS].filter(Boolean));
}

/** Reemplaza la normativa del informe dentro de la transacción `tx` */
export async function guardarVinculos(tx, idInforme, v) {
  if (!v.normas) return;
  await tx.run('DELETE FROM "INFORME_NORMAS" WHERE "ID_INFORME" = ?', [idInforme]);
  for (const [i, n] of v.normas.entries()) {
    await tx.run('INSERT INTO "INFORME_NORMAS" ("ID_INFORME", "NORMA", "ARTICULOS", "ORDEN") VALUES (?, ?, ?, ?)',
      [idInforme, n.NORMA, n.ARTICULOS, i]);
  }
}

/** Normativa de un informe, lista para mostrar */
export async function cargarVinculos(inf) {
  const filas = await DatabaseManager.selectWithOrderBy('INFORME_NORMAS', 'ORDEN', 'ASC', { ID_INFORME: inf.ID_INFORME });
  return { normas: filas.map((n) => ({ NORMA: n.NORMA, ARTICULOS: n.ARTICULOS })) };
}
