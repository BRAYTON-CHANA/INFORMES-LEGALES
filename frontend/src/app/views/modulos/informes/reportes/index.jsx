import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Download } from 'lucide-react';
import {
  Button, Card, Field, Input, ErrorAlert, Spinner, PageHeader,
} from '@/shared/components/ui';
import { informesService } from '@/features/informes/services/informesService';
import { hoyISO } from '@/features/informes/utils/constantes';
import { rutas } from '@/features/informes/utils/rutas';

const haceUnAnio = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmt = (n) => Number(n || 0).toLocaleString('es-PE');

/** Indicador: número grande + etiqueta (no es gráfico) */
const Stat = ({ valor, label, nota }) => (
  <Card className="p-4">
    <p className="text-2xl font-semibold tabular-nums text-slate-900">{fmt(valor)}</p>
    <p className="text-xs text-slate-500">{label}</p>
    {nota && <p className="text-[11px] text-slate-400 mt-0.5">{nota}</p>}
  </Card>
);

/**
 * Barras horizontales ordenadas, un solo tono (magnitud de una serie).
 * Barra fina con extremo redondeado de 4px, base recta; etiqueta y valor en
 * texto (sirven de tabla y los lee el lector de pantalla); detalle al pasar el mouse.
 */
const Barras = ({ titulo, filas, vacio, render, unidad = '' }) => {
  const max = Math.max(1, ...filas.map((f) => f.total));
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-slate-800 mb-3">{titulo}</h2>
      {!filas.length ? <p className="text-sm text-slate-400">{vacio}</p> : (
        <ul className="space-y-2.5">
          {filas.map((f) => (
            <li key={f.clave} className="group" title={`${f.etiqueta}: ${fmt(f.total)}${unidad}`}>
              <div className="flex items-baseline justify-between gap-3 text-xs mb-1">
                <span className="text-slate-700 truncate">{render ? render(f) : f.etiqueta}</span>
                <span className="tabular-nums text-slate-500 shrink-0">{fmt(f.total)}</span>
              </div>
              <div className="h-2.5">
                <div
                  className="h-full rounded-r-[4px] bg-[#2a78d6] opacity-90 group-hover:opacity-100 transition-opacity"
                  style={{ width: `${Math.max(2, (f.total / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

/** CSV de todas las secciones, para adjuntar a informes de gestión */
function exportarCsv(d, desde, hasta) {
  const filas = [['Sección', 'Concepto', 'Valor']];
  const r = d.resumen;
  for (const [k, v] of Object.entries({
    'Informes vigentes': r.informes, 'Públicos': r.publicados, 'No vigentes': r.anulados,
    'Consultas de fichas': r.consultas, Descargas: r.descargas, Búsquedas: r.busquedas,
    'Búsquedas sin resultados': r.busquedasSinResultados,
  })) filas.push(['Resumen', k, v]);
  const secciones = [
    ['Informes por materia', d.porMateria], ['Informes por año', d.porAnio], ['Normas más citadas', d.normasMasCitadas],
    ['Informes más consultados', d.masConsultados], ['Términos más buscados', d.terminos], ['Búsquedas sin resultados', d.sinResultados],
  ];
  for (const [s, lista] of secciones) for (const f of lista) filas.push([s, f.etiqueta, f.total]);

  // Los términos buscados los escriben los usuarios: un texto que empiece con = + - @
  // se exporta con ' delante para que Excel no lo ejecute como fórmula
  const celda = (c) => {
    const s = String(c ?? '');
    return `"${(/^[=+\-@\t\r]/.test(s) && typeof c !== 'number' ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  const csv = filas.map((f) => f.map(celda).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([String.fromCharCode(0xfeff) + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `reporte-informes-${desde}-a-${hasta}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Indicadores del repositorio para la ORAJ (solo ORAJ: la API devuelve 403 al resto) */
const Reportes = () => {
  const [desde, setDesde] = useState(haceUnAnio());
  const [hasta, setHasta] = useState(hoyISO());
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await informesService.reportes({ desde, hasta }));
      setError(null);
    } catch (e) { setError(e.message); }
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  const r = datos?.resumen;

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <PageHeader icon={BarChart3} title="Reportes del repositorio">
        {datos && <Button variant="secondary" onClick={() => exportarCsv(datos, desde, hasta)}><Download size={15} /> Exportar CSV</Button>}
      </PageHeader>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <Field label="Actividad desde"><Input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} /></Field>
        <Field label="hasta"><Input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} /></Field>
        <p className="text-[11px] text-slate-400 pb-2">El rango aplica a consultas, descargas y búsquedas; los conteos de informes son del total vigente.</p>
      </div>

      <ErrorAlert>{error}</ErrorAlert>

      {!datos ? <div className="flex justify-center py-16"><Spinner /></div> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat valor={r.informes} label="Informes vigentes" nota={`${fmt(r.anulados)} no vigentes`} />
            <Stat valor={r.publicados} label="Públicos"
              nota={r.informes ? `${Math.round((r.publicados / r.informes) * 100)}% del total` : null} />
            <Stat valor={r.consultas + r.descargas} label="Consultas y descargas" nota={`${fmt(r.consultas)} fichas · ${fmt(r.descargas)} PDF`} />
            <Stat valor={r.busquedas} label="Búsquedas" nota={`${fmt(r.busquedasSinResultados)} sin resultados`} />
          </div>
          {r.sinTextoBuscable > 0 && (
            <p className="text-xs text-slate-500">
              {fmt(r.sinTextoBuscable)} informe(s) con PDF sin texto buscable (escaneado).
            </p>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Barras titulo="Informes más consultados" filas={datos.masConsultados} vacio="Sin consultas en el rango."
              render={(f) => (
                <Link to={rutas.ficha(f.clave)} className="hover:underline">
                  <span className="font-mono">{f.etiqueta}</span>
                  {f.asunto && <span className="text-slate-400"> — {f.asunto}</span>}
                </Link>
              )} />
            <Barras titulo="Términos más buscados" filas={datos.terminos} vacio="Sin búsquedas en el rango." />
            <Barras titulo="Búsquedas sin resultados (qué falta sistematizar)" filas={datos.sinResultados} vacio="Todas las búsquedas encontraron algo." />
            <Barras titulo="Normas más citadas" filas={datos.normasMasCitadas} vacio="Aún no hay normativa asociada." />
            <Barras titulo="Informes por materia" filas={datos.porMateria} vacio="Aún no hay informes." />
            <Barras titulo="Informes por año" filas={datos.porAnio} vacio="Aún no hay informes." />
          </div>
        </div>
      )}
    </div>
  );
};

export default Reportes;
