import { useRef, useState } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';
import { formatBytes } from '@/shared/utils/format';

/**
 * Elegir un PDF (clic o arrastrar). No sube nada: entrega el File con
 * `onChange(file | null)` y el formulario lo sube al guardar.
 * `actual` = archivo ya guardado ({ NOMBRE_ORIGINAL, TAMANIO, VERSION }), si lo hay.
 * `maxMb` = el límite del servidor (MAX_ARCHIVO_MB, llega en los catálogos de informes).
 */
const ArchivoPdf = ({ label, archivo, actual, onChange, ayuda, maxMb = 10 }) => {
  const input = useRef(null);
  const [sobre, setSobre] = useState(false);
  const [error, setError] = useState(null);

  const elegir = (file) => {
    setError(null);
    if (!file) return;
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) { setError('Debe ser un archivo PDF'); return; }
    if (file.size > maxMb * 1024 * 1024) { setError(`El archivo supera ${maxMb} MB`); return; }
    onChange(file);
  };

  return (
    <div>
      <p className="text-sm font-medium text-slate-700 mb-1.5">{label}</p>
      {archivo ? (
        <div className="flex items-center gap-3 rounded-xl border border-moq-azul/30 bg-sky-50/60 px-4 py-3">
          <FileText size={20} className="text-moq-azul shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-800 truncate">{archivo.name}</p>
            <p className="text-xs text-slate-500">
              {formatBytes(archivo.size)} · se subirá al guardar{actual ? ` como versión ${actual.VERSION + 1}` : ''}
            </p>
          </div>
          <button type="button" onClick={() => onChange(null)} aria-label="Quitar el archivo elegido"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gore-500">
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
          onDragLeave={() => setSobre(false)}
          onDrop={(e) => { e.preventDefault(); setSobre(false); elegir(e.dataTransfer.files?.[0]); }}
          className={`w-full flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gore-500 ${
            sobre ? 'border-gore-400 bg-gore-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <UploadCloud size={22} className="text-slate-400 shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm text-slate-700">
              {actual ? 'Reemplazar por una nueva versión' : <>Arrastra el PDF aquí o <span className="text-moq-azul font-medium">elígelo</span></>}
            </span>
            <span className="block text-xs text-slate-400 truncate">
              {actual ? `Actual: ${actual.NOMBRE_ORIGINAL} (v${actual.VERSION})` : ayuda || `PDF, hasta ${maxMb} MB`}
            </span>
          </span>
        </button>
      )}
      <input ref={input} type="file" accept=".pdf,application/pdf" className="hidden"
        onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ''; }} />
      {error && <p className="text-xs text-red-600 mt-1" role="alert">{error}</p>}
    </div>
  );
};

export default ArchivoPdf;
