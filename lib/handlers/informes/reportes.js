import DatabaseManager from '../../database/DatabaseManager.js';
import { normalizar } from './indice.js';

/**
 * Indicadores del repositorio (solo ORAJ): qué se sistematizó y cómo se usa. Todo se agrega en JS sobre
 * consultas simples, así funciona igual en SQL Server y PostgreSQL.
 *
 * Las vistas de ficha (VER) solo se registran para quien no es de la ORAJ (los
 * visitantes sin sesión), así "consultas" mide el uso del público. Ya no hay uso por
 * unidad ejecutora: las cuentas son solo de la ORAJ y el público entra sin cuenta (025).
 */
const TOP = 10;

/** Cuenta por clave y devuelve [{ etiqueta, total, ...extra }] de mayor a menor */
function ranking(items, clave, etiqueta, limite = TOP) {
  const mapa = new Map();
  for (const it of items) {
    const k = clave(it);
    if (k == null) continue;
    mapa.set(k, (mapa.get(k) || 0) + 1);
  }
  return [...mapa.entries()]
    .map(([k, total]) => ({ clave: k, etiqueta: etiqueta(k), total }))
    .sort((a, b) => b.total - a.total || String(a.etiqueta).localeCompare(String(b.etiqueta)))
    .slice(0, limite);
}

/** Rango [desde, hasta] en fechas locales; por defecto, los últimos 12 meses */
function rango(q = {}) {
  const hoy = new Date();
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(q.desde || '') ? new Date(`${q.desde}T00:00:00`) : new Date(hoy.getFullYear() - 1, hoy.getMonth(), hoy.getDate());
  const hasta = /^\d{4}-\d{2}-\d{2}$/.test(q.hasta || '') ? new Date(`${q.hasta}T23:59:59.999`) : hoy;
  return { desde, hasta };
}

export async function reportes(query) {
  const { desde, hasta } = rango(query);
  const enRango = [{ field: 'FECHA', op: '>=', value: desde }, { field: 'FECHA', op: '<=', value: hasta }];

  const [informes, materias, informeNormas, eventos, busquedas] = await Promise.all([
    DatabaseManager.select('INFORMES', { ACTIVO: true }, [
      'ID_INFORME', 'CODIGO', 'ASUNTO', 'ANIO', 'ID_MATERIA', 'ESTADO', 'PUBLICADO', 'TEXTO_EXTRAIDO', 'FECHA_EMISION',
    ]),
    DatabaseManager.select('MATERIAS', {}, ['ID_MATERIA', 'NOMBRE']),
    DatabaseManager.select('INFORME_NORMAS', {}, ['ID_INFORME', 'NORMA']),
    DatabaseManager.select('INFORME_AUDITORIA', [{ field: 'ACCION', op: 'in', value: ['VER', 'DESCARGAR'] }, ...enRango],
      ['ID_INFORME', 'ACCION']),
    DatabaseManager.select('INFORME_BUSQUEDAS', enRango, ['TEXTO', 'RESULTADOS']),
  ]);

  const nombre = (rows, k, v) => new Map(rows.map((r) => [r[k], r[v]]));
  const materia = nombre(materias, 'ID_MATERIA', 'NOMBRE');
  // Normas escritas igual salvo mayúsculas/tildes/espacios cuentan como una; se muestra la primera forma
  const claveNorma = (n) => normalizar(n.NORMA).replace(/\s+/g, ' ');
  const norma = new Map();
  for (const n of informeNormas) if (!norma.has(claveNorma(n))) norma.set(claveNorma(n), n.NORMA);
  const informe = new Map(informes.map((i) => [i.ID_INFORME, i]));
  const vigentes = informes.filter((i) => i.ESTADO === 'VIGENTE');

  const termino = (b) => normalizar(b.TEXTO).replace(/\s+/g, ' ').toLowerCase();

  return {
    rango: { desde, hasta },
    resumen: {
      informes: vigentes.length,
      publicados: vigentes.filter((i) => i.PUBLICADO).length,
      anulados: informes.length - vigentes.length,
      sinTextoBuscable: vigentes.filter((i) => i.TEXTO_EXTRAIDO === false).length,
      consultas: eventos.filter((e) => e.ACCION === 'VER').length,
      descargas: eventos.filter((e) => e.ACCION === 'DESCARGAR').length,
      busquedas: busquedas.length,
      busquedasSinResultados: busquedas.filter((b) => !b.RESULTADOS).length,
    },
    porAnio: ranking(vigentes, (i) => i.ANIO, (k) => String(k), 50).sort((a, b) => b.clave - a.clave),
    porMateria: ranking(vigentes, (i) => i.ID_MATERIA ?? 0, (k) => materia.get(k) || 'Sin materia', 50),
    normasMasCitadas: ranking(informeNormas.filter((n) => informe.get(n.ID_INFORME)?.ESTADO === 'VIGENTE'),
      claveNorma, (k) => norma.get(k)),
    masConsultados: ranking(eventos.filter((e) => informe.has(e.ID_INFORME)), (e) => e.ID_INFORME, (k) => informe.get(k).CODIGO)
      .map((r) => ({ ...r, asunto: informe.get(r.clave)?.ASUNTO })),
    terminos: ranking(busquedas, termino, (k) => k),
    sinResultados: ranking(busquedas.filter((b) => !b.RESULTADOS), termino, (k) => k),
  };
}
