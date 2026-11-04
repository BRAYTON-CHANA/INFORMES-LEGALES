import { useState, useEffect } from 'react';
import { Search, X, CalendarRange, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { Input, Select, Field } from '@/shared/components/ui';
import DropdownMenu from '@/shared/components/DropdownMenu';
import { hoyISO } from '../utils/constantes';

/** Filtros que no son la búsqueda libre (los que muestran etiqueta y cuentan como activos) */
export const FILTROS_VACIOS = {
  q: '', desde: '', hasta: '', tipo: '', materia: '', area: '', ue: '', norma: '', estado: '', publicado: '',
};

const dmy = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Atajos del período: este año, los anteriores y los últimos 12 meses */
function atajos() {
  const hoy = new Date();
  const a = hoy.getFullYear();
  const hace12 = new Date(hoy);
  hace12.setFullYear(a - 1);
  return [
    { label: 'Últimos 12 meses', desde: iso(hace12), hasta: hoyISO() },
    ...[a, a - 1, a - 2, a - 3].map((y) => ({ label: String(y), desde: `${y}-01-01`, hasta: `${y}-12-31` })),
  ];
}

/** Texto del botón Período: "2025", "01/03/2026 – 15/10/2026", "Desde 01/01/2024"… */
function textoPeriodo(desde, hasta) {
  if (!desde && !hasta) return 'Cualquier fecha';
  const y = desde?.slice(0, 4);
  if (desde === `${y}-01-01` && hasta === `${y}-12-31`) return `Año ${y}`;
  if (desde && hasta) return `${dmy(desde)} – ${dmy(hasta)}`;
  return desde ? `Desde ${dmy(desde)}` : `Hasta ${dmy(hasta)}`;
}

/** Norma por texto (ej. «27444», «Ley de Contrataciones»): espera a que se deje de escribir */
const FiltroNorma = ({ valor, onCambio, className }) => {
  const [texto, setTexto] = useState(valor);
  useEffect(() => { setTexto(valor); }, [valor]); // al quitar la etiqueta o limpiar
  useEffect(() => {
    if (texto === valor) return undefined;
    const t = setTimeout(() => onCambio(texto.trim()), 400);
    return () => clearTimeout(t);
  }, [texto, valor, onCambio]);
  return (
    <Input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} className={className}
      placeholder="Normativa: ej. Ley 27444, 30225, art. 8" aria-label="Normativa asociada" />
  );
};

const chipCls = 'inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs bg-gore-50 text-gore-800 border border-gore-200';
const botonCls = (activo) =>
  `inline-flex items-center gap-1.5 h-[38px] px-3 rounded-lg border text-sm whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gore-500 ${
    activo ? 'border-gore-300 bg-gore-50 text-gore-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  }`;

/**
 * Barra de filtros del repositorio: búsqueda + tipo + materia + período en una fila;
 * el resto en "Más filtros". Los activos se muestran como etiquetas que se quitan con un clic.
 */
const FiltrosInformes = ({ filtros, onCambio, texto, onTexto, catalogos, registrar, total }) => {
  const [mas, setMas] = useState(false);
  const set = (k) => (e) => onCambio({ [k]: e.target.value });

  const nombre = (lista, id, campo, clave) => lista?.find((x) => String(x[clave]) === String(id))?.[campo] || id;
  const etiquetas = [
    (filtros.desde || filtros.hasta) && { k: ['desde', 'hasta'], label: textoPeriodo(filtros.desde, filtros.hasta) },
    filtros.tipo && { k: ['tipo'], label: nombre(catalogos?.tipos, filtros.tipo, 'NOMBRE', 'ID_TIPO_DOCUMENTO') },
    filtros.materia && { k: ['materia'], label: nombre(catalogos?.materias, filtros.materia, 'NOMBRE', 'ID_MATERIA') },
    filtros.norma && { k: ['norma'], label: `Norma: ${filtros.norma}` },
    filtros.area && { k: ['area'], label: `Área: ${nombre(catalogos?.areas, filtros.area, 'NOMBRE', 'ID_AREA')}` },
    filtros.ue && { k: ['ue'], label: `UE: ${nombre(catalogos?.unidades, filtros.ue, 'NOMBRE', 'ID_UNIDAD_EJECUTORA')}` },
    filtros.publicado && { k: ['publicado'], label: filtros.publicado === '1' ? 'Públicos' : 'Privados' },
    filtros.estado && { k: ['estado'], label: filtros.estado === 'ANULADO' ? 'No vigentes' : 'Vigentes' },
  ].filter(Boolean);
  const nMas = ['norma', 'ue', 'area', 'publicado', 'estado'].filter((k) => filtros[k]).length;
  const quitar = (ks) => onCambio(Object.fromEntries(ks.map((k) => [k, ''])));
  const limpiar = () => { onTexto(''); onCambio({ ...FILTROS_VACIOS }); };

  return (
    <div className="mb-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            className="pl-9" type="search" aria-label="Buscar informes"
            placeholder="Buscar por N°, asunto, criterio, norma o texto del PDF…"
            value={texto} onChange={(e) => onTexto(e.target.value)}
          />
        </div>

        <Select value={filtros.tipo} onChange={set('tipo')} aria-label="Tipo de documento de la respuesta" className="w-auto! max-w-[180px]">
          <option value="">Tipo: todos</option>
          {catalogos?.tiposRespuesta?.map((t) => <option key={t.ID_TIPO_DOCUMENTO} value={t.ID_TIPO_DOCUMENTO}>{t.NOMBRE}</option>)}
        </Select>

        <Select value={filtros.materia} onChange={set('materia')} aria-label="Materia" className="w-auto! max-w-[200px]">
          <option value="">Materia: todas</option>
          {catalogos?.materias?.map((m) => <option key={m.ID_MATERIA} value={m.ID_MATERIA}>{m.NOMBRE}</option>)}
        </Select>

        <DropdownMenu
          menuClassName="w-72 p-3"
          align="right"
          trigger={({ triggerRef, open, toggle }) => (
            <button ref={triggerRef} type="button" onClick={toggle} aria-haspopup="dialog" aria-expanded={open}
              className={botonCls(filtros.desde || filtros.hasta)}>
              <CalendarRange size={15} /> {textoPeriodo(filtros.desde, filtros.hasta)} <ChevronDown size={14} className="text-slate-400" />
            </button>
          )}
        >
          {({ close }) => (
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-500">Fecha de emisión</p>
              <div className="flex flex-wrap gap-1.5">
                {atajos().map((a) => {
                  const activo = filtros.desde === a.desde && filtros.hasta === a.hasta;
                  return (
                    <button key={a.label} type="button" onClick={() => { onCambio({ desde: a.desde, hasta: a.hasta }); close(); }}
                      className={`px-2.5 py-1 rounded-full text-xs border ${activo ? 'bg-gore-600 border-gore-600 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                      {a.label}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Desde"><Input type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={set('desde')} /></Field>
                <Field label="Hasta"><Input type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={set('hasta')} /></Field>
              </div>
              <div className="flex justify-between">
                <button type="button" className="text-xs text-slate-500 hover:text-gore-700" onClick={() => { quitar(['desde', 'hasta']); close(); }}>
                  Cualquier fecha
                </button>
                <button type="button" className="text-xs font-medium text-gore-700 hover:underline" onClick={close}>Listo</button>
              </div>
            </div>
          )}
        </DropdownMenu>

        <button type="button" onClick={() => setMas(!mas)} aria-expanded={mas} aria-controls="filtros-mas" className={botonCls(mas || nMas)}>
          <SlidersHorizontal size={15} /> Más filtros
          {nMas > 0 && <span className="ml-0.5 min-w-5 h-5 px-1 rounded-full bg-gore-600 text-white text-[11px] flex items-center justify-center">{nMas}</span>}
        </button>
      </div>

      {mas && (
        <div id="filtros-mas" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/60">
          <div className="lg:col-span-2">
            <FiltroNorma valor={filtros.norma} onCambio={(v) => onCambio({ norma: v })} />
          </div>
          <Select value={filtros.ue} onChange={set('ue')} aria-label="Unidad ejecutora solicitante">
            <option value="">Unidad ejecutora: todas</option>
            {catalogos?.unidades?.map((u) => <option key={u.ID_UNIDAD_EJECUTORA} value={u.ID_UNIDAD_EJECUTORA}>{u.SIGLA || u.NOMBRE}</option>)}
          </Select>
          <Select value={filtros.area} onChange={set('area')} aria-label="Área solicitante">
            <option value="">Área: todas</option>
            {/* Agrupadas por unidad ejecutora (cada UGEL tiene su propia Área de Gestión Administrativa…) */}
            {catalogos?.unidades?.map((u) => {
              const areas = catalogos.areas?.filter((a) => a.ID_UNIDAD_EJECUTORA === u.ID_UNIDAD_EJECUTORA) || [];
              return areas.length ? (
                <optgroup key={u.ID_UNIDAD_EJECUTORA} label={u.SIGLA || u.NOMBRE}>
                  {areas.map((a) => <option key={a.ID_AREA} value={a.ID_AREA}>{a.NOMBRE}</option>)}
                </optgroup>
              ) : null;
            })}
          </Select>
          {registrar && (
            <>
              <Select value={filtros.publicado} onChange={set('publicado')} aria-label="Visibilidad">
                <option value="">Públicos y privados</option>
                <option value="1">Solo públicos</option>
                <option value="0">Solo privados</option>
              </Select>
              <Select value={filtros.estado} onChange={set('estado')} aria-label="Estado">
                <option value="">Vigentes y no vigentes</option>
                <option value="VIGENTE">Solo vigentes</option>
                <option value="ANULADO">Solo no vigentes</option>
              </Select>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 min-h-6">
        {total != null && <span className="text-xs text-slate-500 mr-1">{total} informe(s)</span>}
        {etiquetas.map((e) => (
          <span key={e.k.join()} className={chipCls}>
            <span className="max-w-[260px] truncate">{e.label}</span>
            <button type="button" onClick={() => quitar(e.k)} aria-label={`Quitar filtro ${e.label}`}
              className="p-0.5 rounded-full hover:bg-gore-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gore-500">
              <X size={12} />
            </button>
          </span>
        ))}
        {(etiquetas.length > 0 || texto) && (
          <button type="button" onClick={limpiar} className="text-xs text-slate-500 hover:text-gore-700 underline-offset-2 hover:underline ml-1">
            Limpiar todo
          </button>
        )}
      </div>
    </div>
  );
};

export default FiltrosInformes;
