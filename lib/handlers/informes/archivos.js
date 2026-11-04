import crypto from 'crypto';
import multer from 'multer';
import DatabaseManager from '../../database/DatabaseManager.js';
import { STORAGE, guardar, borrar, rutaArchivo } from '../../storage/archivos.js';

/**
 * Archivos de los informes. Metadatos en INFORME_ARCHIVOS; el binario en Supabase Storage
 * (RUTA_ARCHIVO) o, sin Storage configurado, en la BD (CONTENIDO): ver lib/storage/archivos.js.
 *  - OFICIAL: la respuesta firmada de la ORAJ (solo PDF). Cada subida es una
 *    versión nueva y pasa a ser la principal; nada se sobrescribe.
 *  - SOLICITUD: el documento de origen (oficio, memorando…) con todos sus anexos
 *    en un solo PDF; versionado igual que el oficial.
 * Se guarda el SHA-256 para verificar integridad.
 */
export const MAX_MB = Number(process.env.MAX_ARCHIVO_MB || 25);
export const CATEGORIAS = ['OFICIAL', 'SOLICITUD'];
const PDF = 'application/pdf';

/** Campos de INFORME_ARCHIVOS sin el binario (para listar) */
export const CAMPOS_ARCHIVO = [
  'ID_ARCHIVO', 'ID_INFORME', 'CATEGORIA', 'NOMBRE_ORIGINAL', 'TIPO_MIME', 'TAMANIO',
  'HASH_SHA256', 'VERSION', 'ES_PRINCIPAL', 'ID_USUARIO', 'FECHA_SUBIDA', 'ACTIVO',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: 1 },
  defParamCharset: 'utf8',
}).single('archivo');

/** ¿Es PDF? Por los primeros bytes (no se confía en la extensión ni en el MIME del navegador) */
const esPdf = (buffer) => buffer.subarray(0, 5).toString('latin1') === '%PDF-';

/** Lee el multipart (campo "archivo") → req.file */
function leerMultipart(req, res) {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => (err ? reject(err) : resolve(req.file)));
  });
}

/**
 * Guarda una versión nueva. Devuelve { status, message } si hay error de
 * validación, o { archivo } con la fila guardada (sin CONTENIDO).
 */
export async function subirArchivo(req, res, informe) {
  let file;
  try {
    file = await leerMultipart(req, res);
  } catch (err) {
    if (err.code === 'LIMIT_FILE_SIZE') return { status: 413, message: `El archivo supera ${MAX_MB} MB` };
    return { status: 400, message: err.message };
  }
  if (!file?.buffer?.length) return { status: 400, message: 'Adjunta un archivo (campo "archivo")' };

  // Los campos de texto del multipart llegan en req.body
  const categoria = String(req.body?.categoria || 'OFICIAL').toUpperCase();
  if (!CATEGORIAS.includes(categoria)) return { status: 400, message: 'Categoría no válida' };

  const nombre = String(file.originalname || 'archivo').slice(0, 255);
  if (!esPdf(file.buffer)) return { status: 400, message: 'El archivo debe ser PDF' };
  const mime = PDF;

  const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
  const ultima = await DatabaseManager.aggregate('INFORME_ARCHIVOS', 'MAX', 'VERSION', { ID_INFORME: informe.ID_INFORME, CATEGORIA: categoria });
  const version = Number(ultima || 0) + 1;

  const fila = {
    ID_INFORME: informe.ID_INFORME,
    CATEGORIA: categoria,
    NOMBRE_ORIGINAL: nombre,
    TIPO_MIME: mime,
    TAMANIO: file.size,
    HASH_SHA256: hash,
    VERSION: version,
    ES_PRINCIPAL: true,
    ID_USUARIO: req.user.id_usuario,
    FECHA_SUBIDA: new Date(),
    ACTIVO: true,
  };
  // Con Storage el binario va al bucket primero; la BD guarda solo su ruta
  if (STORAGE === 'supabase') {
    fila.RUTA_ARCHIVO = rutaArchivo(fila);
    try {
      await guardar(fila.RUTA_ARCHIVO, file.buffer, mime);
    } catch (err) {
      // El detalle (clave inválida, bucket, red) va solo al log del servidor
      console.error('[archivos] Supabase Storage:', err.message);
      return { status: 502, message: 'No se pudo guardar el PDF en el almacenamiento. Intenta de nuevo en unos minutos.' };
    }
  } else {
    fila.CONTENIDO = file.buffer;
  }
  const cols = Object.keys(fila);

  // INSERT sin devolver filas (no traer el binario de vuelta) y luego SELECT sin CONTENIDO
  let archivo;
  try {
    archivo = await DatabaseManager.transaction(async (tx) => {
      // Solo hay una versión principal por categoría: la nueva reemplaza a la anterior (que se conserva)
      await tx.run('UPDATE "INFORME_ARCHIVOS" SET "ES_PRINCIPAL" = ? WHERE "ID_INFORME" = ? AND "CATEGORIA" = ?',
        [false, informe.ID_INFORME, categoria]);
      await tx.run(
        `INSERT INTO "INFORME_ARCHIVOS" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        cols.map((c) => fila[c])
      );
      const { rows } = await tx.run(
        `SELECT ${CAMPOS_ARCHIVO.map((c) => `"${c}"`).join(', ')} FROM "INFORME_ARCHIVOS"
         WHERE "ID_INFORME" = ? AND "CATEGORIA" = ? AND "VERSION" = ?`,
        [informe.ID_INFORME, categoria, version]
      );
      return rows[0];
    });
  } catch (err) {
    // No dejar el objeto huérfano en el bucket si la fila no se guardó
    if (fila.RUTA_ARCHIVO) {
      await borrar([fila.RUTA_ARCHIVO]).catch((e) => console.warn('[archivos] No se borró el objeto huérfano:', e.message));
    }
    throw err;
  }
  return { archivo, contenido: file.buffer };
}

/** Envía el binario (`contenido`, de leer()). `inline` = abrir en el navegador (PDF) en vez de descargar */
export function enviarArchivo(res, archivo, contenido, inline = false) {
  const ascii = archivo.NOMBRE_ORIGINAL.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  res.setHeader('Content-Type', archivo.TIPO_MIME);
  res.setHeader('Content-Length', contenido.length);
  res.setHeader('Content-Disposition',
    `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(archivo.NOMBRE_ORIGINAL)}`);
  res.setHeader('X-Content-SHA256', archivo.HASH_SHA256);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(200).end(contenido);
}
