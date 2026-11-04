import { Scale, FileText, Eye, Download, MessageSquareText, ArrowRight } from 'lucide-react';
import { Card, IconButton } from '@/shared/components/ui';
import { formatFecha, formatBytes } from '@/shared/utils/format';

const Seccion = ({ titulo, icon: Icon, children, destacado }) => (
  <section className={`ficha-seccion ${destacado ? 'bg-sky-50/70 border-l-4 border-moq-azul pl-4 py-3 pr-3 rounded-r-xl' : ''}`}>
    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5">
      {Icon && <Icon size={13} />} {titulo}
    </h3>
    <div className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{children}</div>
  </section>
);

const Dato = ({ label, children }) => (
  <div>
    <dt className="text-[11px] text-slate-400">{label}</dt>
    <dd className="text-sm text-slate-800">{children || '—'}</dd>
  </div>
);

const ArchivoFila = ({ a, onAbrir, etiqueta }) => (
  <li className="py-2 flex items-center gap-3">
    <FileText size={16} className="text-slate-400 shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-sm text-slate-800 truncate">{etiqueta || a.NOMBRE_ORIGINAL}</p>
      <p className="text-[11px] text-slate-400 truncate">{a.NOMBRE_ORIGINAL} · {formatBytes(a.TAMANIO)}</p>
    </div>
    <span className="no-print flex">
      {a.TIPO_MIME === 'application/pdf' && <IconButton title="Ver" onClick={() => onAbrir(a, true)}><Eye size={16} /></IconButton>}
      <IconButton title="Descargar" onClick={() => onAbrir(a, false)}><Download size={16} /></IconButton>
    </span>
  </li>
);

/**
 * Ficha resumen del caso: el documento de origen (la «Referencia» del informe) y
 * el informe emitido por la ORAJ, con fecha, materia, resumen, normativa asociada y justificación de la
 * controversia (requisito). La usan la ficha (todos los usuarios) y el
 * detalle de la ORAJ. `onAbrir(archivo, inline)` abre o descarga; si no se pasa,
 * no se listan documentos.
 */
const FichaContenido = ({ inf, onAbrir }) => {
  const oficial = inf.archivos?.find((a) => a.ES_PRINCIPAL) || inf.archivos?.[0];
  const solicitud = inf.solicitud?.find((a) => a.ES_PRINCIPAL) || inf.solicitud?.[0];
  const origen = [inf.TIPO_SOLICITUD, inf.NUMERO_SOLICITUD].filter(Boolean).join(' ');

  return (
    <div className="space-y-4">
      {/* Como la cabecera del informe: documento de origen (Referencia) → informe emitido por la ORAJ */}
      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5">
              <MessageSquareText size={13} /> Documento de origen
            </p>
            {inf.EMITIDO_DE_OFICIO ? (
              <p className="text-sm font-medium text-slate-800">Emitido de oficio por la ORAJ</p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-800">{origen || 'No registrado'}</p>
                <dl className="grid grid-cols-2 gap-3 mt-2">
                  <Dato label="Procedencia">{inf.PROCEDENCIA}</Dato>
                  <Dato label="Fecha del documento">{inf.FECHA_SOLICITUD && formatFecha(inf.FECHA_SOLICITUD)}</Dato>
                  <Dato label="Expediente / registro SGD">{inf.EXPEDIENTE}</Dato>
                </dl>
              </>
            )}
            {inf.NOMBRE_ADMINISTRADO && (
              <dl className="mt-3"><Dato label="Administrado">{inf.NOMBRE_ADMINISTRADO}</Dato></dl>
            )}
          </div>
          <ArrowRight size={18} className="hidden md:block text-slate-300 mt-6" aria-hidden="true" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1.5">
              <Scale size={13} /> Informe emitido
            </p>
            <p className="text-sm font-medium font-mono text-slate-800">{inf.CODIGO}</p>
            <dl className="grid grid-cols-2 gap-3 mt-2">
              <Dato label="Fecha de emisión">{formatFecha(inf.FECHA_EMISION)}</Dato>
              <Dato label="Materia">{inf.MATERIA}</Dato>
            </dl>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-5">
        <Seccion titulo="Asunto">{inf.ASUNTO}</Seccion>
        {inf.RESUMEN && <Seccion titulo="Resumen" destacado>{inf.RESUMEN}</Seccion>}
        {inf.CONTROVERSIA && <Seccion titulo="Controversia / consulta">{inf.CONTROVERSIA}</Seccion>}
        {(inf.ANTECEDENTES || inf.REFERENCIA) && (
          <Seccion titulo="Antecedentes">
            {inf.REFERENCIA && <span className="block text-slate-500 mb-1">Otras referencias: {inf.REFERENCIA}</span>}
            {inf.ANTECEDENTES}
          </Seccion>
        )}

        <Seccion titulo="Normativa asociada" icon={Scale}>
          {inf.normas?.length ? (
            <ul className="list-disc pl-5 space-y-0.5">
              {inf.normas.map((n) => (
                <li key={n.NORMA}>{n.NORMA}{n.ARTICULOS && <span className="text-slate-500"> — {n.ARTICULOS}</span>}</li>
              ))}
            </ul>
          ) : <span className="text-slate-400">Sin normativa registrada</span>}
        </Seccion>

        {inf.CRITERIO && <Seccion titulo="Criterio de la ORAJ" destacado={!inf.RESUMEN}>{inf.CRITERIO}</Seccion>}
        {inf.CONCLUSION && <Seccion titulo="Conclusión">{inf.CONCLUSION}</Seccion>}
        {inf.PALABRAS_CLAVE && <Seccion titulo="Palabras clave">{inf.PALABRAS_CLAVE}</Seccion>}
      </Card>

      {onAbrir && (
        <Card className="p-5">
          {!inf.EMITIDO_DE_OFICIO && (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-1.5"><MessageSquareText size={13} /> Documento de origen</h3>
              {solicitud
                ? <ul><ArchivoFila a={solicitud} onAbrir={onAbrir} etiqueta={origen || 'Documento de origen'} /></ul>
                : <p className="text-sm text-slate-400 mb-4">No se adjuntó el documento de origen.</p>}
            </>
          )}

          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-4 first:mt-0 mb-1 flex items-center gap-1.5"><FileText size={13} /> Informe emitido — documento oficial</h3>
          {oficial
            ? <ul><ArchivoFila a={oficial} onAbrir={onAbrir} etiqueta={inf.CODIGO} /></ul>
            : <p className="text-sm text-slate-400">Aún no se subió el PDF oficial.</p>}
        </Card>
      )}
    </div>
  );
};

export default FichaContenido;
