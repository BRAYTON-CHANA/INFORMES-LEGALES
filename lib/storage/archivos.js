import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';

/**
 * Dónde viven los binarios de INFORME_ARCHIVOS (los PDF). Se elige por .env, en este orden:
 *  - 'supabase': Supabase Storage, bucket privado (SUPABASE_URL + SUPABASE_SECRET_KEY).
 *  - 'disco':    carpeta del servidor (ARCHIVOS_DIR), p. ej. /datos/archivos en el servidor Debian del GORE.
 *  - 'bd':       dentro de la BD (INFORME_ARCHIVOS.CONTENIDO), si no hay ninguno de los dos.
 * En 'supabase' y 'disco' la BD guarda solo los metadatos y RUTA_ARCHIVO, con la MISMA ruta
 * (informes/<id>/<categoría>/v<n>-<hash>.pdf): al mudar de uno a otro basta copiar los archivos
 * (npm run archivos:mudar), la BD no cambia.
 *
 * Las descargas siempre pasan por el backend (permisos y bitácora): ni el bucket ni la carpeta se
 * publican. Supabase se usa por su API REST con fetch; el disco con fs. Sin dependencias.
 */
const MAX_MB = Number(process.env.MAX_ARCHIVO_MB || 25);
const PDF = 'application/pdf';

/** Ruta del PDF: informes/<id>/<categoría>/v<versión>-<hash>.pdf (igual en Storage y en disco) */
export const rutaArchivo = ({ ID_INFORME, CATEGORIA, VERSION, HASH_SHA256 }) =>
  `informes/${ID_INFORME}/${CATEGORIA}/v${VERSION}-${String(HASH_SHA256).slice(0, 12)}.pdf`;

// ---------------------------------------------------------------------------
// Supabase Storage
// ---------------------------------------------------------------------------

/** Cliente de un bucket de Supabase Storage (también lo usa el script de mudanza como origen) */
export function supabaseStorage({ url, clave, bucket = 'informes' }) {
  const base = String(url || '').replace(/\/+$/, '');
  // Storage exige Authorization. Con la secret key nueva (sb_secret_…) va la misma clave en apikey y en
  // Bearer (el gateway de Supabase la cambia por un JWT de servicio); con la service_role legacy, igual
  const cabeceras = (extra = {}) => ({ apikey: clave, Authorization: `Bearer ${clave}`, ...extra });
  const rutaSegura = (ruta) => String(ruta).split('/').map(encodeURIComponent).join('/');

  async function storage(metodo, camino, { body, headers } = {}) {
    const res = await fetch(`${base}/storage/v1/${camino}`, { method: metodo, headers: cabeceras(headers), body });
    if (!res.ok) {
      const detalle = await res.text().catch(() => '');
      const err = new Error(`Storage ${metodo} ${camino}: ${res.status} ${detalle.slice(0, 300)}`);
      err.httpStatus = res.status;
      throw err;
    }
    return res;
  }

  async function preparar() {
    try {
      await storage('GET', `bucket/${bucket}`);
      return 'existe';
    } catch (err) {
      if (err.httpStatus !== 404 && err.httpStatus !== 400) throw err;
    }
    await storage('POST', 'bucket', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: bucket, name: bucket, public: false, file_size_limit: MAX_MB * 1024 * 1024, allowed_mime_types: [PDF],
      }),
    });
    return 'creado';
  }

  // El bucket se comprueba (y se crea si falta) una vez por proceso, antes de la primera subida:
  // así un despliegue nuevo funciona aunque no se haya corrido db:setup con la secret key
  let listo = null;
  const prepararUnaVez = () => {
    listo ??= preparar().catch((err) => { listo = null; throw err; });
    return listo;
  };

  return {
    nombre: `Supabase Storage (bucket "${bucket}")`,
    preparar,
    async guardar(ruta, buffer, mime = PDF) {
      await prepararUnaVez();
      await storage('POST', `object/${bucket}/${rutaSegura(ruta)}`, {
        body: buffer, headers: { 'Content-Type': mime, 'x-upsert': 'false', 'Cache-Control': 'no-store' },
      });
    },
    async leer(ruta) {
      const res = await storage('GET', `object/${bucket}/${rutaSegura(ruta)}`);
      return Buffer.from(await res.arrayBuffer());
    },
    async borrar(rutas) {
      if (!rutas.length) return;
      await storage('DELETE', `object/${bucket}`, {
        body: JSON.stringify({ prefixes: rutas }), headers: { 'Content-Type': 'application/json' },
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Carpeta del servidor
// ---------------------------------------------------------------------------

/** Archivos en una carpeta (ARCHIVOS_DIR). Las rutas no pueden salir de ella */
export function discoStorage({ dir }) {
  const raiz = path.resolve(dir);
  const absoluta = (ruta) => {
    const destino = path.resolve(raiz, String(ruta));
    if (destino !== raiz && !destino.startsWith(raiz + path.sep)) throw new Error(`Ruta fuera de ARCHIVOS_DIR: ${ruta}`);
    return destino;
  };

  return {
    nombre: `carpeta ${raiz}`,
    async preparar() {
      const existia = await fs.stat(raiz).then(() => true, () => false);
      await fs.mkdir(raiz, { recursive: true });
      return existia ? 'existe' : 'creada';
    },
    async guardar(ruta, buffer) {
      const destino = absoluta(ruta);
      await fs.mkdir(path.dirname(destino), { recursive: true });
      // 'wx': nunca sobrescribe (cada versión tiene su propia ruta). Se escribe a un temporal y se renombra,
      // así un corte a mitad de camino no deja un PDF incompleto con el nombre bueno
      const temporal = `${destino}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(temporal, buffer, { flag: 'wx', mode: 0o640 });
      try {
        await fs.link(temporal, destino); // falla si ya existe (como 'wx'), sin pisarlo
      } finally {
        await fs.unlink(temporal).catch(() => {});
      }
    },
    leer: (ruta) => fs.readFile(absoluta(ruta)),
    async borrar(rutas) {
      for (const ruta of rutas) await fs.rm(absoluta(ruta), { force: true });
    },
    /** ¿Ya está ese archivo? (lo usa el script de mudanza) */
    existe: (ruta) => fs.stat(absoluta(ruta)).then(() => true, () => false),
  };
}

// ---------------------------------------------------------------------------
// El almacenamiento de esta instalación
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL || '';
// Secret key nueva (sb_secret_…) o service_role legacy (JWT)
const SUPABASE_CLAVE = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
export const BUCKET = process.env.SUPABASE_BUCKET || 'informes';
export const ARCHIVOS_DIR = process.env.ARCHIVOS_DIR || '';

export const STORAGE = SUPABASE_URL && SUPABASE_CLAVE ? 'supabase' : ARCHIVOS_DIR ? 'disco' : 'bd';

const backend = STORAGE === 'supabase'
  ? supabaseStorage({ url: SUPABASE_URL, clave: SUPABASE_CLAVE, bucket: BUCKET })
  : STORAGE === 'disco' ? discoStorage({ dir: ARCHIVOS_DIR }) : null;

/** Descripción para logs y db:setup */
export const DESTINO = backend?.nombre || 'la base de datos (INFORME_ARCHIVOS.CONTENIDO)';

/** Guarda el binario fuera de la BD (supabase / disco). En 'bd' no se llama: va en la fila */
export async function guardar(ruta, buffer, mime = PDF) {
  if (!backend) throw new Error('Sin almacenamiento externo: el PDF va en la BD');
  await backend.guardar(ruta, buffer, mime);
}

/** Binario de una fila de INFORME_ARCHIVOS (de RUTA_ARCHIVO si la tiene; si no, de CONTENIDO) */
export async function leer(fila) {
  if (fila.RUTA_ARCHIVO) {
    if (!backend) throw new Error(`El archivo ${fila.ID_ARCHIVO} está en ${fila.RUTA_ARCHIVO}, pero no hay almacenamiento configurado`);
    return backend.leer(fila.RUTA_ARCHIVO);
  }
  if (fila.CONTENIDO) return Buffer.isBuffer(fila.CONTENIDO) ? fila.CONTENIDO : Buffer.from(fila.CONTENIDO);
  throw new Error(`Archivo ${fila.ID_ARCHIVO} sin contenido`);
}

/** Borra archivos (los que no existan se ignoran) */
export async function borrar(rutas) {
  const lista = rutas.filter(Boolean);
  if (!backend || !lista.length) return;
  await backend.borrar(lista);
}

/** Crea el bucket o la carpeta si falta (db:setup). 'creado' | 'creada' | 'existe' | null (en la BD) */
export async function asegurarBucket() {
  return backend ? backend.preparar() : null;
}
