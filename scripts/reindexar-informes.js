import 'dotenv/config';
import DatabaseManager from '../lib/database/DatabaseManager.js';
import { reindexar } from '../lib/handlers/informes/indice.js';
import { extraerTexto } from '../lib/handlers/informes/texto.js';
import { leer } from '../lib/storage/archivos.js';

/**
 * Vuelve a extraer el texto del PDF oficial vigente de cada informe y
 * recalcula TEXTO_BUSQUEDA. Útil tras db:migrate o si cambia el índice.
 *
 * Uso: npm run informes:reindexar
 */
async function main() {
  const informes = await DatabaseManager.select('INFORMES', { ACTIVO: true }, ['ID_INFORME', 'CODIGO']);
  let conTexto = 0;
  let sinTexto = 0;

  for (const inf of informes) {
    const [oficial] = await DatabaseManager.select('INFORME_ARCHIVOS', {
      ID_INFORME: inf.ID_INFORME, CATEGORIA: 'OFICIAL', ES_PRINCIPAL: true, ACTIVO: true,
    }, ['ID_ARCHIVO', 'CONTENIDO', 'RUTA_ARCHIVO', 'TIPO_MIME']);
    if (oficial) {
      const { texto, ok } = await extraerTexto(await leer(oficial), oficial.TIPO_MIME);
      await DatabaseManager.update('INFORMES', inf.ID_INFORME, { TEXTO_DOCUMENTO: texto, TEXTO_EXTRAIDO: ok }, 'ID_INFORME');
      if (ok) conTexto++; else { sinTexto++; console.log(`  sin texto (¿escaneado?): ${inf.CODIGO}`); }
    }
    await reindexar(inf.ID_INFORME);
  }
  console.log(`[reindexar] ${informes.length} informe(s): ${conTexto} con texto del PDF, ${sinTexto} sin texto.`);
}

main()
  .catch((err) => { console.error('[reindexar] Error:', err.message); process.exitCode = 1; })
  .finally(() => DatabaseManager.close());
