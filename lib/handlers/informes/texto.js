import { extractText, getDocumentProxy } from 'unpdf';
import mammoth from 'mammoth';

/**
 * Texto del documento oficial para la búsqueda en su contenido.
 * Un PDF escaneado (solo imagen) no tiene texto: queda { ok: false } y la
 * subida sigue igual (el OCR no está incluido).
 */
const MAX_CARACTERES = 1_000_000;
const MIN_CARACTERES = 20; // menos que esto = sin texto útil (escaneado)

export async function extraerTexto(buffer, mime) {
  try {
    let texto = '';
    if (mime === 'application/pdf') {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      ({ text: texto } = await extractText(pdf, { mergePages: true }));
    } else if (mime.includes('wordprocessingml')) {
      ({ value: texto } = await mammoth.extractRawText({ buffer }));
    }
    texto = String(texto || '').replace(/\s+/g, ' ').trim().slice(0, MAX_CARACTERES);
    return { texto: texto.length >= MIN_CARACTERES ? texto : null, ok: texto.length >= MIN_CARACTERES };
  } catch (err) {
    console.warn('[informes/texto] No se pudo extraer texto:', err.message);
    return { texto: null, ok: false };
  }
}
