import DatabaseManager, { DB_CLIENT } from '../../database/DatabaseManager.js';
import { clientIp, error500 } from '../../shared/http.js';
import { permisosInforme, puedeRegistrar, filtrosVisibilidad, esDueno } from './permisos.js';
import { esAdmin } from '../../shared/http.js';
import { subirArchivo, enviarArchivo, CAMPOS_ARCHIVO, MAX_MB } from './archivos.js';
import { leer as leerArchivo, borrar as borrarArchivos } from '../../storage/archivos.js';
import {
  leerVinculos, validarVinculos, guardarVinculos, cargarVinculos, normasParaTexto,
} from './vinculos.js';
import { normalizar, textoBusqueda, reindexar, fragmento } from './indice.js';
import { extraerTexto } from './texto.js';
import { reportes } from './reportes.js';

/**
 * Repositorio de informes legales de la ORAJ.
 *
 *   GET  /api/informes?q&anio&tipo&materia&area&ue&estado&publicado&desde&hasta&page&pageSize
 *   GET  /api/informes/catalogos                 tipos, materias, áreas, unidades, normas
 *   GET  /api/informes/siguiente-numero?tipo&anio
 *   GET  /api/informes/reportes?desde&hasta       indicadores (admin y abogados)
 *   POST /api/informes                           { ID_TIPO_DOCUMENTO, NUMERO, ANIO, ASUNTO, FECHA_EMISION, ... }
 *   GET  /api/informes/:id                       informe + archivos + bitácora
 *   PUT  /api/informes/:id                       (mismos campos)
 *   DELETE /api/informes/:id                     lo borra con sus archivos, normas y bitácora
 *   POST /api/informes/:id/anular                { MOTIVO }  marcar como no vigente
 *   POST /api/informes/:id/publicar              { publicar: bool }  true = público, false = privado
 *   POST /api/informes/:id/archivos              multipart: archivo (PDF), categoria (OFICIAL|SOLICITUD)
 *   GET  /api/informes/:id/archivos/:idArchivo?inline=1
 *
 * Crear / editar aceptan además NORMAS: [{ NORMA, ARTICULOS }] (texto; el catálogo NORMAS solo sugiere).
 * Filtro `norma`: texto libre; el informe debe tener asociada una norma (o artículos) que contenga cada palabra.
 * Estado del informe: VIGENTE o ANULADO (se muestra como "No vigente").
 *
 * Quién ve / edita se decide solo en ./permisos.js.
 */
const SIGLA = process.env.SIGLA_ORAJ || 'GRM/GGR/ORAJ';

const CAMPOS = [
  'ID_TIPO_DOCUMENTO', 'NUMERO', 'ANIO', 'ASUNTO', 'RESUMEN', 'EXPEDIENTE', 'REFERENCIA', 'ID_AREA',
  'ID_TIPO_SOLICITUD', 'NUMERO_SOLICITUD', 'FECHA_SOLICITUD', 'ID_UE_SOLICITANTE', 'EMITIDO_DE_OFICIO',
  'NOMBRE_ADMINISTRADO',
  'ID_MATERIA', 'FECHA_EMISION', 'CONTROVERSIA', 'ANTECEDENTES', 'CRITERIO',
  'CONCLUSION', 'PALABRAS_CLAVE',
];
const CAMPOS_ENTEROS = [
  'ID_TIPO_DOCUMENTO', 'NUMERO', 'ANIO', 'ID_AREA', 'ID_MATERIA', 'ID_TIPO_SOLICITUD', 'ID_UE_SOLICITANTE',
];
const CAMPOS_TEXTO = [
  'ASUNTO', 'RESUMEN', 'EXPEDIENTE', 'REFERENCIA', 'NUMERO_SOLICITUD', 'NOMBRE_ADMINISTRADO', 'CONTROVERSIA', 'ANTECEDENTES', 'CRITERIO',
  'CONCLUSION', 'PALABRAS_CLAVE',
];

/** Columnas del listado, de VW_INFORMES (sin textos largos; los nombres ya vienen unidos) */
const CAMPOS_LISTA = [
  'ID_INFORME', 'ID_TIPO_DOCUMENTO', 'NUMERO', 'ANIO', 'CODIGO', 'ASUNTO', 'EXPEDIENTE',
  'ID_TIPO_SOLICITUD', 'NUMERO_SOLICITUD', 'ID_UE_SOLICITANTE', 'NOMBRE_ADMINISTRADO', 'EMITIDO_DE_OFICIO',
  'ID_AREA', 'ID_MATERIA', 'FECHA_EMISION', 'ESTADO', 'PUBLICADO', 'ID_USUARIO_REGISTRO',
  'RESUMEN', 'CRITERIO',
  'TIPO_DOCUMENTO', 'TIPO_SOLICITUD', 'MATERIA', 'UE_SOLICITANTE', 'UE_SIGLA', 'AREA', 'PROCEDENCIA',
];

/** Lo que el usuario puede hacer en general (para mostrar u ocultar botones) */
const perfil = (user) => ({ admin: esAdmin(user), registrar: puedeRegistrar(user) });


const armarCodigo = (prefijo, numero, anio) => `${prefijo} N° ${String(numero).padStart(3, '0')}-${anio}-${SIGLA}`;

/**
 * Columna DATE → 'YYYY-MM-DD'. mssql la entrega como medianoche UTC y pg como
 * medianoche local, por eso se leen partes distintas según el motor.
 */
function fechaISO(d) {
  if (!(d instanceof Date)) return d;
  const utc = DB_CLIENT === 'mssql';
  const y = utc ? d.getUTCFullYear() : d.getFullYear();
  const m = (utc ? d.getUTCMonth() : d.getMonth()) + 1;
  const day = utc ? d.getUTCDate() : d.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function leerInforme(body = {}) {
  const data = {};
  for (const c of CAMPOS) if (body[c] !== undefined) data[c] = body[c];
  for (const c of CAMPOS_ENTEROS) {
    if (c in data) data[c] = data[c] === '' || data[c] == null ? null : Number(data[c]);
  }
  for (const c of CAMPOS_TEXTO) {
    if (c in data) data[c] = data[c] == null ? null : String(data[c]).trim() || null;
  }
  if ('EMITIDO_DE_OFICIO' in data) data.EMITIDO_DE_OFICIO = data.EMITIDO_DE_OFICIO === true || data.EMITIDO_DE_OFICIO === 'true';
  if ('FECHA_SOLICITUD' in data) data.FECHA_SOLICITUD = data.FECHA_SOLICITUD || null;
  return data;
}

const esFecha = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !Number.isNaN(new Date(v).getTime());
const CAMPOS_FECHA = ['FECHA_EMISION', 'FECHA_SOLICITUD'];

/** Emitido de oficio = sin documento de origen ni procedencia (se limpian por si venían llenos) */
const sinOrigen = (d) => (d.EMITIDO_DE_OFICIO
  ? { ...d, ID_TIPO_SOLICITUD: null, NUMERO_SOLICITUD: null, FECHA_SOLICITUD: null, ID_UE_SOLICITANTE: null, ID_AREA: null }
  : d);

/**
 * Documento de origen obligatorio (tipo, número y la unidad ejecutora de la que procede; la
 * oficina o área es opcional y debe ser de esa UE, lo comprueba prepararGuardado), salvo de oficio
 */
function validarOrigen(d) {
  if (d.EMITIDO_DE_OFICIO) return null;
  if (!d.ID_TIPO_SOLICITUD || !d.NUMERO_SOLICITUD) {
    return 'Indica el documento de origen (tipo y número) o marca "Emitido de oficio"';
  }
  if (!d.ID_UE_SOLICITANTE) return 'Indica la unidad ejecutora de la que procede el documento de origen';
  if (d.FECHA_SOLICITUD && !esFecha(d.FECHA_SOLICITUD)) return 'Fecha del documento de origen no válida';
  if (d.FECHA_SOLICITUD && d.FECHA_SOLICITUD > d.FECHA_EMISION) {
    return 'La fecha del documento de origen no puede ser posterior a la emisión del informe';
  }
  return null;
}

function validar(d) {
  if (!Number.isInteger(d.ID_TIPO_DOCUMENTO)) return 'El tipo de documento es obligatorio';
  if (!Number.isInteger(d.NUMERO) || d.NUMERO < 1) return 'El número debe ser un entero mayor que 0';
  if (!Number.isInteger(d.ANIO) || d.ANIO < 1990 || d.ANIO > 2100) return 'Año no válido';
  if (!d.ASUNTO) return 'El asunto es obligatorio';
  if (d.ASUNTO.length > 500) return 'El asunto no puede pasar de 500 caracteres';
  if (!esFecha(d.FECHA_EMISION)) return 'Fecha de emisión no válida';
  const origen = validarOrigen(d);
  if (origen) return origen;
  if ((d.RESUMEN || '').length > 3000) return 'El resumen no puede pasar de 3000 caracteres';
  if ((d.CRITERIO || '').length > 2000) return 'El criterio no puede pasar de 2000 caracteres';
  if ((d.NUMERO_SOLICITUD || '').length > 150) return 'El número del documento de solicitud no puede pasar de 150 caracteres';
  if ((d.NOMBRE_ADMINISTRADO || '').length > 300) return 'El nombre del administrado no puede pasar de 300 caracteres';
  for (const c of ['ID_AREA', 'ID_MATERIA', 'ID_TIPO_SOLICITUD', 'ID_UE_SOLICITANTE']) {
    if (d[c] != null && !Number.isInteger(d[c])) return `${c} no válido`;
  }
  return null;
}

async function auditar(req, idInforme, accion, detalle = null) {
  await DatabaseManager.insert('INFORME_AUDITORIA', {
    ID_INFORME: idInforme,
    ID_USUARIO: req.user?.id_usuario ?? null, // null = visitante sin sesión
    ACCION: accion,
    DETALLE: detalle ? String(detalle).slice(0, 1000) : null,
    IP: clientIp(req),
    FECHA: new Date(),
  });
}

/** Fila de VW_INFORMES lista para el front (fechas DATE como 'YYYY-MM-DD') */
const conFechas = (inf) => ({
  ...inf,
  FECHA_EMISION: fechaISO(inf.FECHA_EMISION),
  FECHA_SOLICITUD: fechaISO(inf.FECHA_SOLICITUD) ?? null,
});

/** Nombre completo de cada usuario (autores de archivos y bitácora) */
async function nombresUsuarios(ids) {
  const unicos = [...new Set(ids.filter(Boolean))];
  const filas = unicos.length
    ? await DatabaseManager.select('USUARIOS', [{ field: 'ID_USUARIO', op: 'in', value: unicos }], ['ID_USUARIO', 'NOMBRES', 'APELLIDOS'])
    : [];
  return new Map(filas.map((u) => [u.ID_USUARIO, [u.NOMBRES, u.APELLIDOS].filter(Boolean).join(' ')]));
}

/** INSERT / UPDATE dentro de una transacción (sin devolver filas) */
async function txInsertar(tx, tabla, data) {
  const cols = Object.keys(data);
  await tx.run(`INSERT INTO "${tabla}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
    cols.map((c) => data[c] ?? null));
}
async function txActualizar(tx, tabla, pk, id, data) {
  const cols = Object.keys(data);
  await tx.run(`UPDATE "${tabla}" SET ${cols.map((c) => `"${c}" = ?`).join(', ')} WHERE "${pk}" = ?`,
    [...cols.map((c) => data[c] ?? null), id]);
}

/**
 * Completa CODIGO y TEXTO_BUSQUEDA y revisa que el número no se repita.
 * `v` = normativa del body (leerVinculos).
 */
async function prepararGuardado(d, idActual = null, v = {}) {
  const errorVinculos = await validarVinculos(v);
  if (errorVinculos) return { status: 400, message: errorVinculos };
  const tipo = await DatabaseManager.getById('TIPOS_DOCUMENTO', d.ID_TIPO_DOCUMENTO, 'ID_TIPO_DOCUMENTO');
  if (!tipo?.USO_RESPUESTA) return { status: 400, message: 'Tipo de documento de la respuesta no válido' };
  if (d.ID_TIPO_SOLICITUD) {
    const tipoSol = await DatabaseManager.getById('TIPOS_DOCUMENTO', d.ID_TIPO_SOLICITUD, 'ID_TIPO_DOCUMENTO');
    if (!tipoSol?.USO_SOLICITUD) return { status: 400, message: 'Tipo de documento de la pregunta no válido' };
  }
  // La oficina o área (opcional) tiene que ser de la unidad ejecutora elegida
  if (d.ID_AREA) {
    const area = await DatabaseManager.getById('AREAS', d.ID_AREA, 'ID_AREA');
    if (!area || area.ID_UNIDAD_EJECUTORA !== d.ID_UE_SOLICITANTE) {
      return { status: 400, message: 'La oficina o área no pertenece a la unidad ejecutora elegida' };
    }
  }

  const CODIGO = armarCodigo(tipo.PREFIJO, d.NUMERO, d.ANIO);
  const iguales = await DatabaseManager.select('INFORMES', {
    ID_TIPO_DOCUMENTO: d.ID_TIPO_DOCUMENTO, ANIO: d.ANIO, NUMERO: d.NUMERO,
  }, ['ID_INFORME']);
  if (iguales.some((r) => r.ID_INFORME !== idActual)) {
    return { status: 409, message: `Ya existe el ${CODIGO}` };
  }
  const normas = await normasParaTexto(v, idActual);
  // El texto del PDF oficial ya extraído también entra al índice
  const [actual] = idActual ? await DatabaseManager.select('INFORMES', { ID_INFORME: idActual }, ['TEXTO_DOCUMENTO']) : [];
  const texto = await textoBusqueda({ ...d, CODIGO, TEXTO_DOCUMENTO: actual?.TEXTO_DOCUMENTO }, normas);
  return { data: { ...d, CODIGO, TEXTO_BUSQUEDA: texto } };
}

async function listar(req, res) {
  const q = req.query || {};
  const page = Math.max(1, Number(q.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 20));
  const entero = (v) => (v === undefined || v === '' ? undefined : Number(v));

  // Filtros mal formados → 400 (no un error del motor)
  for (const k of ['anio', 'tipo', 'materia', 'area', 'ue', 'page', 'pageSize']) {
    if (q[k] !== undefined && q[k] !== '' && !/^\d{1,9}$/.test(String(q[k]))) {
      return res.status(400).json({ success: false, message: `Filtro no válido: ${k}` });
    }
  }
  for (const k of ['desde', 'hasta']) {
    if (q[k] && (!/^\d{4}-\d{2}-\d{2}$/.test(String(q[k])) || Number.isNaN(Date.parse(q[k])))) {
      return res.status(400).json({ success: false, message: `Fecha no válida: ${k} (AAAA-MM-DD)` });
    }
  }
  if (typeof q.q === 'string' && q.q.length > 200) return res.status(400).json({ success: false, message: 'Búsqueda demasiado larga' });
  if (typeof q.norma === 'string' && q.norma.length > 200) return res.status(400).json({ success: false, message: 'Norma demasiado larga' });

  // Norma: informes con alguna norma asociada que contenga todas las palabras (sin mayúsculas ni tildes).
  // INFORME_NORMAS es chica (pocas normas por informe): se filtra en JS y se pasa como IN
  const palabrasNorma = normalizar(q.norma).split(/\s+/).filter(Boolean);
  let idsNorma;
  if (palabrasNorma.length) {
    const vinculos = await DatabaseManager.select('INFORME_NORMAS', {}, ['ID_INFORME', 'NORMA', 'ARTICULOS']);
    idsNorma = [...new Set(vinculos
      .filter((n) => { const t = normalizar(`${n.NORMA} ${n.ARTICULOS || ''}`); return palabrasNorma.every((p) => t.includes(p)); })
      .map((n) => n.ID_INFORME))];
  }

  const filtros = [
    { field: 'ACTIVO', op: '=', value: true },
    { field: 'ANIO', op: '=', value: entero(q.anio) },
    { field: 'ID_TIPO_DOCUMENTO', op: '=', value: entero(q.tipo) },
    { field: 'ID_MATERIA', op: '=', value: entero(q.materia) },
    { field: 'ID_AREA', op: '=', value: entero(q.area) },
    { field: 'ID_UE_SOLICITANTE', op: '=', value: entero(q.ue) },
    { field: 'ESTADO', op: '=', value: q.estado || undefined },
    { field: 'FECHA_EMISION', op: '>=', value: q.desde || undefined },
    { field: 'FECHA_EMISION', op: '<=', value: q.hasta || undefined },
    { field: 'PUBLICADO', op: '=', value: q.publicado === '1' ? true : q.publicado === '0' ? false : undefined },
    // Sin coincidencias → ID imposible (IN de una lista vacía no es SQL válido)
    ...(idsNorma ? [{ field: 'ID_INFORME', op: 'in', value: idsNorma.length ? idsNorma : [0] }] : []),
    ...(await filtrosVisibilidad(req.user)),
  ];
  // Cada palabra debe aparecer (AND de LIKE sobre la misma columna)
  const palabras = normalizar(q.q).split(/\s+/).map((p) => p.replace(/[%_[\]]/g, '')).filter(Boolean);
  for (const palabra of palabras) filtros.push({ field: 'TEXTO_BUSQUEDA', op: 'like', value: palabra });

  // VW_INFORMES: mismas columnas que INFORMES + los nombres ya unidos (tipo, materia, procedencia…)
  const [rows, total] = await Promise.all([
    DatabaseManager.selectPaginated('VW_INFORMES', page, pageSize, filtros, CAMPOS_LISTA, 'ANIO DESC, NUMERO DESC, ID_INFORME DESC'),
    DatabaseManager.count('VW_INFORMES', filtros),
  ]);

  // Registro de la búsqueda para los reportes (primera página, texto de 3+ letras;
  // los buscadores internos, como el de relacionar informes, mandan registrar=0)
  const textoBuscado = String(q.q || '').trim();
  if (textoBuscado.length >= 3 && page === 1 && q.registrar !== '0') {
    DatabaseManager.insert('INFORME_BUSQUEDAS', {
      ID_USUARIO: req.user?.id_usuario ?? null,
      TEXTO: textoBuscado.slice(0, 200),
      RESULTADOS: total,
      FECHA: new Date(),
    }).catch((err) => console.warn('[informes] No se registró la búsqueda:', err.message));
  }

  // Con búsqueda: fragmento del documento donde aparece la palabra (solo esta página)
  const fragmentos = new Map();
  if (palabras.length && rows.length) {
    const textos = await DatabaseManager.select('INFORMES',
      [{ field: 'ID_INFORME', op: 'in', value: rows.map((r) => r.ID_INFORME) }], ['ID_INFORME', 'TEXTO_DOCUMENTO']);
    for (const t of textos) fragmentos.set(t.ID_INFORME, fragmento(t.TEXTO_DOCUMENTO, palabras));
  }

  // PDF actual del informe y del documento de origen, para abrirlos desde la tabla
  const pdfs = new Map();
  if (rows.length) {
    const archivos = await DatabaseManager.select('INFORME_ARCHIVOS', [
      { field: 'ID_INFORME', op: 'in', value: rows.map((r) => r.ID_INFORME) },
      { field: 'ES_PRINCIPAL', op: '=', value: true },
      { field: 'ACTIVO', op: '=', value: true },
    ], ['ID_ARCHIVO', 'ID_INFORME', 'CATEGORIA', 'NOMBRE_ORIGINAL']);
    for (const a of archivos) {
      pdfs.set(`${a.ID_INFORME}:${a.CATEGORIA}`, { ID_ARCHIVO: a.ID_ARCHIVO, NOMBRE_ORIGINAL: a.NOMBRE_ORIGINAL });
    }
  }

  return res.json({
    success: true,
    data: {
      items: rows.map((r) => ({
        ...conFechas(r),
        PDF_OFICIAL: pdfs.get(`${r.ID_INFORME}:OFICIAL`) || null,
        PDF_ORIGEN: pdfs.get(`${r.ID_INFORME}:SOLICITUD`) || null,
        FRAGMENTO: fragmentos.get(r.ID_INFORME) || null,
        PUEDE_EDITAR: esAdmin(req.user) || esDueno(req.user, r),
      })),
      total, page, pageSize, puedeRegistrar: puedeRegistrar(req.user), perfil: perfil(req.user),
    },
  });
}

/** "Otros" al final de un desplegable (sort estable: el resto conserva el orden alfabético de la BD) */
const otrosAlFinal = (lista) => {
  const esOtros = (x) => (['OTROS', 'OTRO', 'OTRAS'].includes(normalizar(x.NOMBRE)) ? 1 : 0);
  return [...lista].sort((a, b) => esOtros(a) - esOtros(b));
};

async function catalogos(req, res) {
  const [normas, tipos, materiasBD, areas, unidades] = await Promise.all([
    DatabaseManager.selectWithOrderBy('NORMAS', 'DENOMINACION', 'ASC', { ACTIVO: true }),
    DatabaseManager.selectWithOrderBy('TIPOS_DOCUMENTO', 'ORDEN, NOMBRE', 'ASC', { ACTIVO: true }),
    DatabaseManager.selectWithOrderBy('MATERIAS', 'NOMBRE', 'ASC', { ACTIVO: true }),
    // Áreas en el orden en que se registraron (la dirección primero); UE por su número
    DatabaseManager.selectWithOrderBy('VW_AREAS', 'ID_UNIDAD_EJECUTORA, ID_AREA', 'ASC', { ACTIVO: true }),
    DatabaseManager.selectWithOrderBy('UNIDADES_EJECUTORAS', 'CODIGO, NOMBRE', 'ASC', { ACTIVO: true }),
  ]);
  // Cada lista en su orden configurado (Configuración → Tipos de documento): más común primero
  const tiposRespuesta = tipos.filter((t) => t.USO_RESPUESTA);
  const tiposSolicitud = tipos.filter((t) => t.USO_SOLICITUD)
    .sort((a, b) => a.ORDEN_SOLICITUD - b.ORDEN_SOLICITUD || a.NOMBRE.localeCompare(b.NOMBRE, 'es'));
  const materias = otrosAlFinal(materiasBD);

  return res.json({
    success: true,
    data: {
      tipos, tiposRespuesta, tiposSolicitud, materias, areas, normas, unidades, sigla: SIGLA, maxArchivoMb: MAX_MB,
      puedeRegistrar: puedeRegistrar(req.user), perfil: perfil(req.user),
    },
  });
}

async function siguienteNumero(req, res) {
  const tipo = Number(req.query?.tipo);
  const anio = Number(req.query?.anio) || new Date().getFullYear();
  if (!Number.isInteger(tipo)) return res.status(400).json({ success: false, message: 'Indica el tipo' });
  const max = await DatabaseManager.aggregate('INFORMES', 'MAX', 'NUMERO', { ID_TIPO_DOCUMENTO: tipo, ANIO: anio });
  return res.json({ success: true, data: { numero: Number(max || 0) + 1, anio } });
}

async function crear(req, res) {
  if (!puedeRegistrar(req.user)) return res.status(403).json({ success: false, message: 'No puedes registrar informes' });

  const d = sinOrigen({ EMITIDO_DE_OFICIO: false, ...leerInforme(req.body) });
  const error = validar(d);
  if (error) return res.status(400).json({ success: false, message: error });

  const v = leerVinculos(req.body);
  const prep = await prepararGuardado(d, null, v);
  if (prep.status) return res.status(prep.status).json({ success: false, message: prep.message });

  // Informe y normativa en una sola transacción
  const row = await DatabaseManager.transaction(async (tx) => {
    await txInsertar(tx, 'INFORMES', {
      ...prep.data,
      ESTADO: 'VIGENTE',
      PUBLICADO: false,
      ID_USUARIO_REGISTRO: req.user.id_usuario,
      FECHA_CREACION: new Date(),
      ACTIVO: true,
    });
    const { rows } = await tx.run(
      'SELECT * FROM "INFORMES" WHERE "ID_TIPO_DOCUMENTO" = ? AND "ANIO" = ? AND "NUMERO" = ?',
      [d.ID_TIPO_DOCUMENTO, d.ANIO, d.NUMERO]);
    await guardarVinculos(tx, rows[0].ID_INFORME, v);
    return rows[0];
  });
  await auditar(req, row.ID_INFORME, 'CREAR', row.CODIGO);
  return res.json({ success: true, data: { ...row, FECHA_EMISION: fechaISO(row.FECHA_EMISION) } });
}

/**
 * Informe activo + permisos, o responde el error.
 * necesita: 'ver' | 'editar' (editar, subir archivos, anular, público/privado: quien lo registró o el admin)
 */
async function cargar(req, res, id, necesita = 'ver') {
  const inf = await DatabaseManager.getById('INFORMES', id, 'ID_INFORME');
  const permisos = permisosInforme(req.user, inf?.ACTIVO ? inf : null);
  if (!inf || !inf.ACTIVO || !permisos.ver) {
    res.status(404).json({ success: false, message: 'Informe no encontrado' });
    return null;
  }
  if (necesita === 'editar' && !permisos.editar) {
    res.status(403).json({ success: false, message: 'No puedes modificar este informe' });
    return null;
  }
  if (necesita !== 'ver' && inf.ESTADO === 'ANULADO') {
    res.status(400).json({ success: false, message: 'El informe no está vigente' });
    return null;
  }
  return { inf, permisos };
}

async function detalle(req, res, id) {
  const r = await cargar(req, res, id);
  if (!r) return;
  const { editar, registrar } = r.permisos;
  const [archivos, bitacora, vinculos, [vista]] = await Promise.all([
    DatabaseManager.selectWithOrderBy('INFORME_ARCHIVOS', 'VERSION', 'DESC', { ID_INFORME: id, ACTIVO: true }, CAMPOS_ARCHIVO),
    editar ? DatabaseManager.selectWithOrderBy('INFORME_AUDITORIA', 'FECHA', 'DESC', { ID_INFORME: id }) : [],
    cargarVinculos(r.inf),
    // La vista trae los nombres (tipo, materia, procedencia, registrado por…); no trae TEXTO_DOCUMENTO
    DatabaseManager.select('VW_INFORMES', { ID_INFORME: id }),
  ]);
  // Consulta de un usuario regular (indicador de uso en reportes)
  if (!registrar) await auditar(req, id, 'VER');
  const { TEXTO_BUSQUEDA, ...inf } = vista; // eslint-disable-line no-unused-vars
  const usuarios = await nombresUsuarios([...archivos, ...bitacora].map((x) => x.ID_USUARIO));
  const conAutor = (a) => ({ ...a, SUBIDO_POR: usuarios.get(a.ID_USUARIO) || null });
  return res.json({
    success: true,
    data: {
      ...conFechas(inf),
      ...vinculos,
      // Versiones del informe firmado (OFICIAL) y del documento de origen (SOLICITUD), la principal primero
      archivos: archivos.filter((a) => a.CATEGORIA === 'OFICIAL').map(conAutor),
      solicitud: archivos.filter((a) => a.CATEGORIA === 'SOLICITUD').map(conAutor),
      bitacora: bitacora.map((b) => ({ ...b, USUARIO: usuarios.get(b.ID_USUARIO) || null })),
      permisos: r.permisos,
    },
  });
}

async function actualizar(req, res, id) {
  const r = await cargar(req, res, id, 'editar');
  if (!r) return;

  const cambios = leerInforme(req.body);
  const guardado = Object.fromEntries(CAMPOS.map((c) => [c, CAMPOS_FECHA.includes(c) ? fechaISO(r.inf[c]) ?? null : r.inf[c]]));
  const d = sinOrigen({ ...guardado, EMITIDO_DE_OFICIO: Boolean(r.inf.EMITIDO_DE_OFICIO), ...cambios });
  const error = validar(d);
  if (error) return res.status(400).json({ success: false, message: error });

  const v = leerVinculos(req.body);
  const prep = await prepararGuardado(d, id, v);
  if (prep.status) return res.status(prep.status).json({ success: false, message: prep.message });

  const modificados = CAMPOS.filter((c) => c in cambios && String(cambios[c] ?? '') !== String(guardado[c] ?? ''));
  if (v.normas) modificados.push('NORMATIVA');
  const row = await DatabaseManager.transaction(async (tx) => {
    await txActualizar(tx, 'INFORMES', 'ID_INFORME', id, { ...prep.data, FECHA_MODIFICACION: new Date() });
    await guardarVinculos(tx, id, v);
    return (await tx.run('SELECT * FROM "INFORMES" WHERE "ID_INFORME" = ?', [id])).rows[0];
  });
  await auditar(req, id, 'EDITAR', modificados.length ? `Campos: ${modificados.join(', ')}` : 'Sin cambios');
  return res.json({ success: true, data: { ...row, FECHA_EMISION: fechaISO(row.FECHA_EMISION) } });
}

/** Marcar como no vigente (ESTADO = 'ANULADO'): no se borra nada y deja de verse para los demás */
async function anular(req, res, id) {
  const r = await cargar(req, res, id, 'editar');
  if (!r) return;
  const motivo = String(req.body?.MOTIVO || '').trim();
  if (!motivo) return res.status(400).json({ success: false, message: 'Indica el motivo' });

  await DatabaseManager.update('INFORMES', id, {
    ESTADO: 'ANULADO', MOTIVO_ANULACION: motivo.slice(0, 500), PUBLICADO: false, FECHA_MODIFICACION: new Date(),
  }, 'ID_INFORME');
  await auditar(req, id, 'ANULAR', motivo);
  return res.json({ success: true });
}

/** Eliminar de verdad: el informe, sus archivos, su normativa y su bitácora (no se puede deshacer) */
async function eliminar(req, res, id) {
  const r = await cargar(req, res, id);
  if (!r) return;
  if (!r.permisos.editar) return res.status(403).json({ success: false, message: 'No puedes eliminar este informe' });

  // Rutas de sus PDF en Storage (todas las versiones): se borran después de confirmar el DELETE
  const rutas = (await DatabaseManager.select('INFORME_ARCHIVOS', { ID_INFORME: id }, ['RUTA_ARCHIVO']))
    .map((a) => a.RUTA_ARCHIVO).filter(Boolean);
  await DatabaseManager.transaction(async (tx) => {
    for (const tabla of ['INFORME_ARCHIVOS', 'INFORME_NORMAS', 'INFORME_AUDITORIA', 'INFORMES']) {
      await tx.run(`DELETE FROM "${tabla}" WHERE "ID_INFORME" = ?`, [id]);
    }
  });
  await borrarArchivos(rutas).catch((err) => console.warn(`[informes] PDF de ${id} no borrados de Storage:`, err.message));
  console.info(`[informes] ${r.inf.CODIGO} (id ${id}) eliminado por el usuario ${req.user.id_usuario}`);
  return res.json({ success: true });
}

/** Hacer público (lo ven todos los usuarios) o privado (solo quien lo registró y el admin) */
async function publicar(req, res, id) {
  const r = await cargar(req, res, id, 'editar');
  if (!r) return;
  const activar = req.body?.publicar !== false;

  if (activar) {
    // Estructura mínima para quien lo consulte: PDF firmado, fecha, materia, resumen y normativa asociada
    const [pdf, normas] = await Promise.all([
      DatabaseManager.count('INFORME_ARCHIVOS', {
        ID_INFORME: id, CATEGORIA: 'OFICIAL', ES_PRINCIPAL: true, ACTIVO: true, TIPO_MIME: 'application/pdf',
      }),
      DatabaseManager.count('INFORME_NORMAS', { ID_INFORME: id }),
    ]);
    const falta = [
      !pdf && 'PDF del informe firmado',
      !r.inf.FECHA_EMISION && 'fecha de emisión',
      !r.inf.ID_MATERIA && 'materia',
      !String(r.inf.RESUMEN || '').trim() && 'resumen',
      !normas && 'normativa asociada',
    ].filter(Boolean);
    if (falta.length) return res.status(400).json({ success: false, message: `Para hacerlo público falta: ${falta.join(', ')}` });
  }

  await DatabaseManager.update('INFORMES', id, activar
    ? { PUBLICADO: true, FECHA_PUBLICACION: new Date(), ID_USUARIO_PUBLICA: req.user.id_usuario }
    : { PUBLICADO: false }, 'ID_INFORME');
  await auditar(req, id, activar ? 'PUBLICAR' : 'RETIRAR');
  return res.json({ success: true, data: { PUBLICADO: activar } });
}

async function subir(req, res, id) {
  const r = await cargar(req, res, id, 'editar');
  if (!r) return;
  const { status, message, archivo, contenido } = await subirArchivo(req, res, r.inf);
  if (status) return res.status(status).json({ success: false, message });

  // El texto del PDF oficial vigente entra a la búsqueda (si es escaneado, queda marcado)
  if (archivo.CATEGORIA === 'OFICIAL') {
    const { texto, ok } = await extraerTexto(contenido, archivo.TIPO_MIME);
    await DatabaseManager.update('INFORMES', id, { TEXTO_DOCUMENTO: texto, TEXTO_EXTRAIDO: ok }, 'ID_INFORME');
    await reindexar(id);
    archivo.TEXTO_EXTRAIDO = ok;
  }
  const que = `${archivo.CATEGORIA === 'OFICIAL' ? 'Informe firmado' : 'Documento de origen'} v${archivo.VERSION}`;
  await auditar(req, id, 'SUBIR_ARCHIVO', `${que} · ${archivo.NOMBRE_ORIGINAL} · SHA-256 ${archivo.HASH_SHA256}`);
  return res.json({ success: true, data: archivo });
}

async function descargar(req, res, id, idArchivo) {
  const r = await cargar(req, res, id);
  if (!r) return;
  const [archivo] = await DatabaseManager.select('INFORME_ARCHIVOS', { ID_ARCHIVO: idArchivo, ID_INFORME: id, ACTIVO: true });
  if (!archivo) return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
  const contenido = await leerArchivo(archivo);
  await auditar(req, id, 'DESCARGAR', `v${archivo.VERSION} · ${archivo.NOMBRE_ORIGINAL}`);
  return enviarArchivo(res, archivo, contenido, req.query?.inline === '1');
}

export default async function handler(req, res, segments) {
  const [s0, s1, s2] = segments;
  const id = s0 && /^\d+$/.test(s0) ? Number(s0) : null;
  const id2 = /^\d+$/.test(s2 || '') ? Number(s2) : null;

  // Sin sesión (repositorio público) solo se consulta: lista, catálogos, ficha y descarga
  const lectura = req.method === 'GET' && (!s0 || s0 === 'catalogos' || (id && !s1) || (id && s1 === 'archivos' && id2));
  if (!req.user && !lectura) {
    return res.status(401).json({ success: false, message: 'Inicia sesión para continuar' });
  }

  try {
    if (!s0) {
      if (req.method === 'GET') return await listar(req, res);
      if (req.method === 'POST') return await crear(req, res);
    }
    if (s0 === 'catalogos' && req.method === 'GET') return await catalogos(req, res);
    if (s0 === 'siguiente-numero' && req.method === 'GET') return await siguienteNumero(req, res);
    if (s0 === 'reportes' && req.method === 'GET') {
      if (!puedeRegistrar(req.user)) return res.status(403).json({ success: false, message: 'Solo para la ORAJ' });
      return res.json({ success: true, data: await reportes(req.query) });
    }

    if (id && !s1) {
      if (req.method === 'GET') return await detalle(req, res, id);
      if (req.method === 'PUT') return await actualizar(req, res, id);
      if (req.method === 'DELETE') return await eliminar(req, res, id);
    }
    if (id && s1 === 'anular' && req.method === 'POST') return await anular(req, res, id);
    if (id && s1 === 'publicar' && req.method === 'POST') return await publicar(req, res, id);
    if (id && s1 === 'archivos' && !s2 && req.method === 'POST') return await subir(req, res, id);
    if (id && s1 === 'archivos' && id2 && req.method === 'GET') return await descargar(req, res, id, id2);

    res.status(404).json({ success: false, message: 'Ruta no encontrada' });
  } catch (error) {
    error500(res, 'informes', error);
  }
}
