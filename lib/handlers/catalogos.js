/**
 * Catálogos administrables con validación en el servidor (reemplaza al CRUD
 * genérico por /api/execute).
 *
 *   GET  /api/catalogos/:clave[?inactivos=1]   lista (los inactivos, solo el admin)
 *   POST /api/catalogos/:clave                 crear      ┐
 *   PUT  /api/catalogos/:clave/:id             editar     ├ solo el admin
 *   POST /api/catalogos/:clave/:id/activo      { activo } ┘ baja lógica (no se borra nada)
 *
 * Los abogados ven la configuración en modo lectura (solo lo activo); el admin la modifica.
 *
 * Para agregar un catálogo: su tabla (database/sql/<motor>/tables/), una entrada
 * en CATALOGOS y su página en frontend/src/app/views/configuracion/<clave>/.
 */
import DatabaseManager from '../database/DatabaseManager.js';
import { esAdmin, error500 } from '../shared/http.js';
import { normalizar } from './informes/indice.js';
import { ROLES_EDICION } from './informes/permisos.js';

export const TIPOS_NORMA = [
  'Constitución', 'Ley', 'Decreto Legislativo', 'Decreto Supremo', 'Ordenanza Regional', 'Resolución', 'Directiva', 'Otro',
];

/**
 * campos: { COL: { label, requerido?, max?, tipo?: 'bool'|'int'|'ref', ref?: { tabla, pk }, patron?: [RegExp, mensaje], opciones?, mayusculas?, porDefecto? } }
 *   tipo 'ref' = id de otra tabla (debe existir)
 * unicos: columnas que no se pueden repetir (sin distinguir mayúsculas ni tildes);
 * unicosPor: columna dentro de la cual se aplica (p. ej. el nombre del área, por unidad ejecutora)
 * roles: quién lo ve (crear, editar y desactivar: siempre solo el admin)
 * vista (opcional): vista de database/sql/<motor>/views/ de la que se lee la lista (se escribe en `tabla`)
 */
const CATALOGOS = {
  'unidades-ejecutoras': {
    tabla: 'UNIDADES_EJECUTORAS', pk: 'ID_UNIDAD_EJECUTORA', orden: 'CODIGO, NOMBRE', nombre: 'la unidad ejecutora',
    roles: ROLES_EDICION,
    campos: {
      NOMBRE: { label: 'Nombre', requerido: true, max: 200 },
      SIGLA: { label: 'Sigla', max: 30, mayusculas: true },
      CODIGO: { label: 'Código de UE', max: 10, patron: [/^\d+$/, 'solo dígitos'] },
    },
    unicos: ['NOMBRE', 'CODIGO'],
  },
  'tipos-documento': {
    tabla: 'TIPOS_DOCUMENTO', pk: 'ID_TIPO_DOCUMENTO', orden: 'ORDEN, NOMBRE', nombre: 'el tipo de documento',
    roles: ROLES_EDICION,
    campos: {
      NOMBRE: { label: 'Nombre', requerido: true, max: 100 },
      PREFIJO: { label: 'Prefijo del código', requerido: true, max: 50, mayusculas: true },
      // En qué lista aparece (respuesta de la ORAJ / pregunta) y su posición (1 = primero)
      USO_RESPUESTA: { label: 'Respuesta de la ORAJ', tipo: 'bool' },
      USO_SOLICITUD: { label: 'Documento de la pregunta', tipo: 'bool' },
      ORDEN: { label: 'Orden como respuesta', tipo: 'int', porDefecto: 50 },
      ORDEN_SOLICITUD: { label: 'Orden como pregunta', tipo: 'int', porDefecto: 50 },
    },
    unicos: ['NOMBRE'],
  },
  materias: {
    tabla: 'MATERIAS', pk: 'ID_MATERIA', orden: 'NOMBRE', nombre: 'la materia',
    roles: ROLES_EDICION,
    campos: { NOMBRE: { label: 'Nombre', requerido: true, max: 150 } },
    unicos: ['NOMBRE'],
  },
  normas: {
    tabla: 'NORMAS', pk: 'ID_NORMA', orden: 'DENOMINACION', nombre: 'la norma',
    roles: ROLES_EDICION,
    campos: {
      DENOMINACION: { label: 'Denominación', requerido: true, max: 300 },
      TIPO: { label: 'Tipo', max: 50, opciones: TIPOS_NORMA },
      NUMERO: { label: 'Número', max: 50 },
    },
    unicos: ['DENOMINACION'],
  },
  areas: {
    tabla: 'AREAS', vista: 'VW_AREAS', pk: 'ID_AREA', orden: 'ID_UNIDAD_EJECUTORA, ID_AREA', nombre: 'el área',
    roles: ROLES_EDICION,
    campos: {
      ID_UNIDAD_EJECUTORA: {
        label: 'Unidad ejecutora', requerido: true, tipo: 'ref', ref: { tabla: 'UNIDADES_EJECUTORAS', pk: 'ID_UNIDAD_EJECUTORA' },
      },
      NOMBRE: { label: 'Nombre', requerido: true, max: 200 },
      SIGLA: { label: 'Sigla', max: 30, mayusculas: true },
    },
    unicos: ['NOMBRE'],
    unicosPor: 'ID_UNIDAD_EJECUTORA',
  },
};

const puede = (user, roles) => esAdmin(user) || (user?.roles || []).some((r) => roles.includes(r));

class ErrorValidacion extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** Limpia y valida el cuerpo; solo pasan las columnas declaradas */
async function validar(cat, body = {}) {
  const datos = {};
  for (const [col, def] of Object.entries(cat.campos)) {
    let v = body[col];
    if (def.tipo === 'bool') { datos[col] = Boolean(v); continue; }
    if (def.tipo === 'ref') {
      const id = Number(v);
      if (!v || !Number.isInteger(id)) {
        if (def.requerido) throw new ErrorValidacion(400, `Falta: ${def.label}`);
        datos[col] = null;
        continue;
      }
      if (!(await DatabaseManager.count(def.ref.tabla, { [def.ref.pk]: id }))) throw new ErrorValidacion(400, `${def.label}: no válida`);
      datos[col] = id;
      continue;
    }
    if (def.tipo === 'int') {
      if (v === '' || v == null) { datos[col] = def.porDefecto ?? null; continue; }
      if (!/^\d{1,3}$/.test(String(v).trim())) throw new ErrorValidacion(400, `${def.label}: número entre 0 y 999`);
      datos[col] = Number(v);
      continue;
    }
    v = v == null ? '' : String(v).trim().replace(/\s+/g, ' ');
    if (def.mayusculas) v = v.toUpperCase();
    if (!v) {
      if (def.requerido) throw new ErrorValidacion(400, `Falta: ${def.label}`);
      datos[col] = null;
      continue;
    }
    if (def.max && v.length > def.max) throw new ErrorValidacion(400, `${def.label}: máximo ${def.max} caracteres`);
    if (def.patron && !def.patron[0].test(v)) throw new ErrorValidacion(400, `${def.label}: ${def.patron[1]}`);
    if (def.opciones && !def.opciones.includes(v)) throw new ErrorValidacion(400, `${def.label}: valor no válido`);
    datos[col] = v;
  }
  return datos;
}

/** 409 si otro registro (de la misma `unicosPor`, si hay) ya tiene el mismo valor en una columna única */
async function verificarUnicos(cat, datos, idActual = null) {
  const por = cat.unicosPor;
  const filas = await DatabaseManager.select(cat.tabla, por ? { [por]: datos[por] } : {}, [cat.pk, ...cat.unicos]);
  for (const col of cat.unicos) {
    if (datos[col] == null) continue;
    const buscado = normalizar(datos[col]);
    const otro = filas.find((f) => f[cat.pk] !== idActual && f[col] != null && normalizar(f[col]) === buscado);
    if (otro) throw new ErrorValidacion(409, `Ya existe ${cat.nombre} con ${cat.campos[col].label} «${otro[col]}»`);
  }
}

async function listar(req, res, cat) {
  // Los inactivos solo los ve el admin (quien puede reactivarlos)
  const filtros = req.query?.inactivos === '1' && esAdmin(req.user) ? {} : { ACTIVO: true };
  const data = await DatabaseManager.selectWithOrderBy(cat.vista || cat.tabla, cat.orden, 'ASC', filtros);
  return res.json({ success: true, data });
}

async function crear(req, res, cat) {
  const datos = await validar(cat, req.body);
  await verificarUnicos(cat, datos);
  const [fila] = await DatabaseManager.insert(cat.tabla, { ...datos, ACTIVO: true });
  return res.status(201).json({ success: true, data: fila, message: 'Registro creado' });
}

async function cargar(cat, id) {
  const [fila] = await DatabaseManager.select(cat.tabla, { [cat.pk]: id });
  if (!fila) throw new ErrorValidacion(404, 'Registro no encontrado');
  return fila;
}

async function actualizar(req, res, cat, id) {
  await cargar(cat, id);
  const datos = await validar(cat, req.body);
  await verificarUnicos(cat, datos, id);
  const [fila] = await DatabaseManager.update(cat.tabla, id, datos, cat.pk);
  return res.json({ success: true, data: fila, message: 'Registro actualizado' });
}

async function cambiarActivo(req, res, cat, id) {
  await cargar(cat, id);
  const activo = Boolean(req.body?.activo);
  const [fila] = await DatabaseManager.update(cat.tabla, id, { ACTIVO: activo }, cat.pk);
  return res.json({ success: true, data: fila, message: activo ? 'Activado' : 'Desactivado' });
}

export default async function handler(req, res, segments) {
  const [clave, s1, s2] = segments;
  const cat = CATALOGOS[clave];
  if (!cat) return res.status(404).json({ success: false, message: 'Catálogo no encontrado' });
  if (!puede(req.user, cat.roles)) return res.status(403).json({ success: false, message: 'No tienes permiso para este catálogo' });
  if (req.method !== 'GET' && !esAdmin(req.user)) {
    return res.status(403).json({ success: false, message: 'Solo el administrador puede modificar la configuración' });
  }
  const id = /^\d+$/.test(s1 || '') ? Number(s1) : null;

  try {
    if (!s1 && req.method === 'GET') return await listar(req, res, cat);
    if (!s1 && req.method === 'POST') return await crear(req, res, cat);
    if (id && !s2 && req.method === 'PUT') return await actualizar(req, res, cat, id);
    if (id && s2 === 'activo' && req.method === 'POST') return await cambiarActivo(req, res, cat, id);
    return res.status(405).json({ success: false, message: 'Operación no permitida (los catálogos no se eliminan: se desactivan)' });
  } catch (error) {
    error500(res, 'catalogos', error);
  }
}
