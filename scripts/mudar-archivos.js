import 'dotenv/config';
import crypto from 'crypto';
import DatabaseManager from '../lib/database/DatabaseManager.js';
import { supabaseStorage, discoStorage, rutaArchivo } from '../lib/storage/archivos.js';

/**
 * Copia los PDF de INFORME_ARCHIVOS a la carpeta del servidor (ARCHIVOS_DIR), para la mudanza
 * desde Supabase al servidor del GORE. Se corre DESPUÉS de restaurar la BD (pg_restore): las filas
 * ya traen RUTA_ARCHIVO, y en disco se usa la misma ruta, así la BD no cambia.
 *
 * Origen de cada PDF:
 *  - fila con RUTA_ARCHIVO → se descarga de Supabase Storage (ORIGEN_SUPABASE_URL,
 *    ORIGEN_SUPABASE_SECRET_KEY, ORIGEN_SUPABASE_BUCKET=informes);
 *  - fila con CONTENIDO (PDF guardado en la BD) → se escribe en disco y se le pone RUTA_ARCHIVO;
 *    con --vaciar-bd, además se borra CONTENIDO (la BD queda liviana).
 *
 * Cada archivo se verifica con su HASH_SHA256. Se puede correr varias veces: salta los que ya
 * están en disco con el hash correcto. No borra nada de Supabase.
 *
 * Uso (en el servidor):
 *   docker compose exec -e ORIGEN_SUPABASE_URL=https://<ref>.supabase.co \
 *     -e ORIGEN_SUPABASE_SECRET_KEY=sb_secret_... app npm run archivos:mudar
 */
const VACIAR_BD = process.argv.includes('--vaciar-bd');
const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

async function main() {
  if (!process.env.ARCHIVOS_DIR) throw new Error('Falta ARCHIVOS_DIR (la carpeta de destino de los PDF)');
  const destino = discoStorage({ dir: process.env.ARCHIVOS_DIR });
  await destino.preparar();

  const origenUrl = process.env.ORIGEN_SUPABASE_URL;
  const origenClave = process.env.ORIGEN_SUPABASE_SECRET_KEY;
  const origen = origenUrl && origenClave
    ? supabaseStorage({ url: origenUrl, clave: origenClave, bucket: process.env.ORIGEN_SUPABASE_BUCKET || 'informes' })
    : null;
  console.log(`[mudar] Destino: ${destino.nombre}`);
  console.log(`[mudar] Origen: ${origen ? origen.nombre : 'solo los PDF guardados en la BD (sin ORIGEN_SUPABASE_*)'}`);

  const filas = await DatabaseManager.select('INFORME_ARCHIVOS', {}, [
    'ID_ARCHIVO', 'ID_INFORME', 'CATEGORIA', 'VERSION', 'HASH_SHA256', 'RUTA_ARCHIVO', 'NOMBRE_ORIGINAL',
  ]);
  const total = { copiados: 0, yaEstaban: 0, desdeBd: 0, errores: 0 };

  for (const f of filas) {
    const etiqueta = `archivo ${f.ID_ARCHIVO} (informe ${f.ID_INFORME}, ${f.CATEGORIA} v${f.VERSION})`;
    try {
      const ruta = f.RUTA_ARCHIVO || rutaArchivo(f);

      // ¿Ya está en disco y es el mismo?
      if (await destino.existe(ruta)) {
        if (sha(await destino.leer(ruta)) === f.HASH_SHA256) {
          total.yaEstaban++;
          if (!f.RUTA_ARCHIVO) await DatabaseManager.update('INFORME_ARCHIVOS', f.ID_ARCHIVO, { RUTA_ARCHIVO: ruta }, 'ID_ARCHIVO');
          continue;
        }
        throw new Error(`en disco hay un archivo distinto en ${ruta} (no se pisa: revísalo a mano)`);
      }

      let contenido;
      if (f.RUTA_ARCHIVO) {
        if (!origen) throw new Error('está en Supabase Storage y faltan ORIGEN_SUPABASE_URL / ORIGEN_SUPABASE_SECRET_KEY');
        contenido = await origen.leer(f.RUTA_ARCHIVO);
      } else {
        const [conBinario] = await DatabaseManager.select('INFORME_ARCHIVOS', { ID_ARCHIVO: f.ID_ARCHIVO }, ['CONTENIDO']);
        if (!conBinario?.CONTENIDO) throw new Error('no tiene RUTA_ARCHIVO ni CONTENIDO');
        contenido = Buffer.from(conBinario.CONTENIDO);
        total.desdeBd++;
      }
      if (sha(contenido) !== f.HASH_SHA256) throw new Error('el hash no coincide con el registrado (archivo dañado en el origen)');

      await destino.guardar(ruta, contenido);
      if (sha(await destino.leer(ruta)) !== f.HASH_SHA256) throw new Error('el archivo escrito no coincide (disco)');

      if (!f.RUTA_ARCHIVO) {
        await DatabaseManager.update('INFORME_ARCHIVOS', f.ID_ARCHIVO,
          VACIAR_BD ? { RUTA_ARCHIVO: ruta, CONTENIDO: null } : { RUTA_ARCHIVO: ruta }, 'ID_ARCHIVO');
      }
      total.copiados++;
      console.log(`  OK  ${etiqueta} → ${ruta}`);
    } catch (err) {
      total.errores++;
      console.error(`  ERROR ${etiqueta}: ${err.message}`);
    }
  }

  console.log(`[mudar] ${filas.length} archivo(s): ${total.copiados} copiado(s) (${total.desdeBd} desde la BD), `
    + `${total.yaEstaban} ya estaban, ${total.errores} con error.`);
  if (total.desdeBd && !VACIAR_BD) console.log('[mudar] Los PDF copiados desde la BD siguen también en CONTENIDO: usa --vaciar-bd para quitarlos.');
  if (total.errores) process.exitCode = 1;
}

main()
  .catch((err) => { console.error('[mudar] Error:', err.message); process.exitCode = 1; })
  .finally(() => DatabaseManager.close());
