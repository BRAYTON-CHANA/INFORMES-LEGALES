import DatabaseManager from '../../database/DatabaseManager.js';
import { normasParaTexto } from './vinculos.js';

/**
 * Índice de búsqueda: INFORMES.TEXTO_BUSQUEDA reúne en mayúsculas y sin tildes
 * los datos del informe, el texto de sus normas y el texto del documento oficial. La búsqueda libre es un LIKE por
 * palabra sobre esa columna, igual en SQL Server y PostgreSQL.
 */

/** Mayúsculas sin tildes: así se guarda TEXTO_BUSQUEDA y se compara la búsqueda */
export const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

export async function textoBusqueda(d, normas = []) {
  const [area, materia, ue, tipoSol] = await Promise.all([
    d.ID_AREA ? DatabaseManager.getById('AREAS', d.ID_AREA, 'ID_AREA') : null,
    d.ID_MATERIA ? DatabaseManager.getById('MATERIAS', d.ID_MATERIA, 'ID_MATERIA') : null,
    d.ID_UE_SOLICITANTE ? DatabaseManager.getById('UNIDADES_EJECUTORAS', d.ID_UE_SOLICITANTE, 'ID_UNIDAD_EJECUTORA') : null,
    d.ID_TIPO_SOLICITUD ? DatabaseManager.getById('TIPOS_DOCUMENTO', d.ID_TIPO_SOLICITUD, 'ID_TIPO_DOCUMENTO') : null,
  ]);
  return normalizar([
    d.CODIGO, d.ASUNTO, d.RESUMEN, d.EXPEDIENTE, d.REFERENCIA, d.PALABRAS_CLAVE, d.CONTROVERSIA, d.ANTECEDENTES,
    tipoSol?.NOMBRE, d.NUMERO_SOLICITUD, d.NOMBRE_ADMINISTRADO, ue?.NOMBRE, ue?.SIGLA,
    d.CRITERIO, d.CONCLUSION, area?.NOMBRE, area?.SIGLA, materia?.NOMBRE, ...normas, d.TEXTO_DOCUMENTO,
  ].filter(Boolean).join(' | '));
}

/** Recalcula TEXTO_BUSQUEDA de un informe con lo que hay en la BD */
export async function reindexar(idInforme) {
  const inf = await DatabaseManager.getById('INFORMES', idInforme, 'ID_INFORME');
  if (!inf) return;
  const texto = await textoBusqueda(inf, await normasParaTexto({}, idInforme));
  await DatabaseManager.update('INFORMES', idInforme, { TEXTO_BUSQUEDA: texto }, 'ID_INFORME');
}

/**
 * Fragmento del texto del documento alrededor de la primera palabra buscada
 * que aparezca (para mostrar en la lista). Compara sin tildes ni mayúsculas.
 */
export function fragmento(texto, palabras, ancho = 90) {
  if (!texto || !palabras.length) return null;
  // Normalizar carácter por carácter conserva las posiciones del original
  const plano = texto.split('').map((c) => normalizar(c)[0] || ' ').join('');
  for (const p of palabras) {
    const i = plano.indexOf(p);
    if (i < 0) continue;
    const desde = Math.max(0, i - ancho);
    const hasta = Math.min(texto.length, i + p.length + ancho);
    return `${desde > 0 ? '…' : ''}${texto.slice(desde, hasta).trim()}${hasta < texto.length ? '…' : ''}`;
  }
  return null;
}
