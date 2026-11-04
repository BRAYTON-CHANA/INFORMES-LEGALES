import 'dotenv/config';

/**
 * Dónde viven los binarios de INFORME_ARCHIVOS (los PDF):
 *  - 'supabase': Supabase Storage, bucket privado (SUPABASE_URL + SUPABASE_SECRET_KEY). La BD guarda
 *    solo los metadatos y RUTA_ARCHIVO. Es lo que se usa en producción (la BD gratuita tiene 500 MB).
 *  - 'bd': dentro de la BD (INFORME_ARCHIVOS.CONTENIDO), si no hay Storage configurado (SQL Server, local).
 *
 * Las descargas siempre pasan por el backend (permisos y bitácora): el bucket no tiene políticas y
 * la clave pública (publishable/anon) no puede leerlo. Se usa la API REST de Storage con fetch.
 */
const URL_BASE = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
// Secret key nueva (sb_secret_…) o service_role legacy (JWT)
const CLAVE = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const BUCKET = process.env.SUPABASE_BUCKET || 'informes';
export const STORAGE = URL_BASE && CLAVE ? 'supabase' : 'bd';
const MAX_MB = Number(process.env.MAX_ARCHIVO_MB || 25);

// Storage exige Authorization. Con la secret key nueva (sb_secret_…) va la misma clave en apikey y en
// Bearer (el gateway de Supabase la cambia por un JWT de servicio); con la service_role legacy, igual
const cabeceras = (extra = {}) => ({ apikey: CLAVE, Authorization: `Bearer ${CLAVE}`, ...extra });

/** Ruta dentro del bucket, sin barras ni caracteres raros */
const rutaSegura = (ruta) => String(ruta).split('/').map(encodeURIComponent).join('/');

async function storage(metodo, camino, { body, headers } = {}) {
  const res = await fetch(`${URL_BASE}/storage/v1/${camino}`, { method: metodo, headers: cabeceras(headers), body });
  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    const err = new Error(`Storage ${metodo} ${camino}: ${res.status} ${detalle.slice(0, 300)}`);
    err.httpStatus = res.status;
    throw err;
  }
  return res;
}

/** Ruta del PDF en el bucket: informes/<id>/<categoría>/v<versión>-<hash>.pdf */
export const rutaArchivo = ({ ID_INFORME, CATEGORIA, VERSION, HASH_SHA256 }) =>
  `informes/${ID_INFORME}/${CATEGORIA}/v${VERSION}-${String(HASH_SHA256).slice(0, 12)}.pdf`;

// El bucket se comprueba (y se crea si falta) una vez por proceso, antes de la primera subida:
// así un despliegue nuevo funciona aunque no se haya corrido db:setup con la secret key
let bucketListo = null;
const prepararBucket = () => {
  bucketListo ??= asegurarBucket().catch((err) => { bucketListo = null; throw err; });
  return bucketListo;
};

/** Sube el binario (solo con Storage). No sobrescribe: cada versión tiene su propia ruta */
export async function guardar(ruta, buffer, mime = 'application/pdf') {
  await prepararBucket();
  await storage('POST', `object/${BUCKET}/${rutaSegura(ruta)}`, {
    body: buffer, headers: { 'Content-Type': mime, 'x-upsert': 'false', 'Cache-Control': 'no-store' },
  });
}

/** Binario de una fila de INFORME_ARCHIVOS (de Storage si tiene RUTA_ARCHIVO; si no, de CONTENIDO) */
export async function leer(fila) {
  if (fila.RUTA_ARCHIVO) {
    const res = await storage('GET', `object/${BUCKET}/${rutaSegura(fila.RUTA_ARCHIVO)}`);
    return Buffer.from(await res.arrayBuffer());
  }
  if (fila.CONTENIDO) return Buffer.isBuffer(fila.CONTENIDO) ? fila.CONTENIDO : Buffer.from(fila.CONTENIDO);
  throw new Error(`Archivo ${fila.ID_ARCHIVO} sin contenido`);
}

/** Borra objetos del bucket (los que no existan se ignoran) */
export async function borrar(rutas) {
  const lista = rutas.filter(Boolean);
  if (STORAGE !== 'supabase' || !lista.length) return;
  await storage('DELETE', `object/${BUCKET}`, {
    body: JSON.stringify({ prefixes: lista }), headers: { 'Content-Type': 'application/json' },
  });
}

/** Crea el bucket privado si no existe (db:setup). Devuelve 'creado' | 'existe' | null (sin Storage) */
export async function asegurarBucket() {
  if (STORAGE !== 'supabase') return null;
  try {
    await storage('GET', `bucket/${BUCKET}`);
    return 'existe';
  } catch (err) {
    if (err.httpStatus !== 404 && err.httpStatus !== 400) throw err;
  }
  await storage('POST', 'bucket', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: BUCKET, name: BUCKET, public: false,
      file_size_limit: MAX_MB * 1024 * 1024, allowed_mime_types: ['application/pdf'],
    }),
  });
  return 'creado';
}
