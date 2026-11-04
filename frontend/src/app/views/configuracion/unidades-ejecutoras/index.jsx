import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Landmark, Plus, Pencil, ToggleLeft, ToggleRight, ChevronRight, ChevronDown, Search, Building2,
} from 'lucide-react';
import {
  Modal, Spinner, EmptyState, Badge, Button, ErrorAlert, PageHeader, Card, Field, Input, IconButton,
} from '@/shared/components/ui';
import { Toast, useToast } from '@/shared/components/Toast';
import { useAuthContext } from '@/shared/context/AuthContext';
import { useCatalogo } from '@/features/catalogos/hooks/useCatalogo';

const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Botón activar / desactivar de una fila */
const Alternar = ({ fila, onClick }) => (
  <IconButton title={fila.ACTIVO ? 'Desactivar' : 'Activar'} className="hover:text-amber-600" onClick={onClick}>
    {fila.ACTIVO ? <ToggleRight size={16} className="text-moq-verde" /> : <ToggleLeft size={16} />}
  </IconButton>
);

/**
 * Configuración › Organización › Unidades ejecutoras y sus oficinas, en una sola página:
 * cada UE se despliega con sus oficinas o áreas (las que firman el documento de origen).
 * Solo el admin crea, edita, desactiva y ve lo inactivo; los abogados la ven en modo lectura.
 */
const UnidadesEjecutoras = () => {
  const { isAdmin } = useAuthContext();
  const ues = useCatalogo('unidades-ejecutoras');
  const areas = useCatalogo('areas');
  const [buscar, setBuscar] = useState('');
  const [abiertas, setAbiertas] = useState(new Set());
  // Formulario abierto: { tipo: 'ue' | 'area', fila: null (nuevo) | fila, datos }
  const [form, setForm] = useState(null);
  const [errorForm, setErrorForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const { toast, avisar } = useToast();

  const verInactivos = ues.verInactivos;
  const setVerInactivos = (v) => { ues.setVerInactivos(v); areas.setVerInactivos(v); };

  const abrir = (tipo, fila, base = {}) => {
    setErrorForm(null);
    setForm({
      tipo,
      fila,
      datos: fila ? { ...fila } : tipo === 'ue' ? { CODIGO: '', SIGLA: '', NOMBRE: '' } : { NOMBRE: '', SIGLA: '', ...base },
    });
  };
  const set = (col, v) => setForm((f) => ({ ...f, datos: { ...f.datos, [col]: v } }));

  const enviar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const cat = form.tipo === 'ue' ? ues : areas;
      const pk = form.tipo === 'ue' ? 'ID_UNIDAD_EJECUTORA' : 'ID_AREA';
      await cat.guardar(form.fila ? form.fila[pk] : null, form.datos);
      avisar(form.fila ? 'Cambios guardados' : form.tipo === 'ue' ? 'Unidad ejecutora creada' : 'Oficina agregada');
      if (form.tipo === 'area') setAbiertas((s) => new Set(s).add(Number(form.datos.ID_UNIDAD_EJECUTORA)));
      setForm(null);
    } catch (err) {
      setErrorForm(err.message);
    } finally { setGuardando(false); }
  };

  const alternar = async (cat, id, activo) => {
    try { await cat.alternarActivo(id, activo); } catch (err) { avisar(err.message, true); }
  };

  const toggle = (id) => setAbiertas((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  // Filtro: la UE aparece si coincide ella o alguna de sus oficinas (y entonces se muestra abierta)
  const q = sinTildes(buscar.trim());
  const coincide = (x) => !q || sinTildes(`${x.NOMBRE} ${x.SIGLA || ''} ${x.CODIGO || ''}`).includes(q);
  const areasDe = (id) => (areas.filas || []).filter((a) => a.ID_UNIDAD_EJECUTORA === id);
  const lista = (ues.filas || [])
    .map((u) => {
      const suyas = areasDe(u.ID_UNIDAD_EJECUTORA);
      const ueCoincide = coincide(u);
      return { ...u, suyas: ueCoincide ? suyas : suyas.filter(coincide), ueCoincide };
    })
    .filter((u) => u.ueCoincide || u.suyas.length);

  const cargando = ues.filas === null || areas.filas === null;

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <nav className="flex items-center gap-1 text-xs text-slate-400 mb-2" aria-label="Ruta">
        <Link to="/configuracion" className="hover:text-gore-600">Configuración</Link>
        <ChevronRight size={12} />
        <span className="text-slate-500">Unidades ejecutoras y oficinas</span>
      </nav>
      <PageHeader icon={Landmark} title="Unidades ejecutoras y oficinas">
        {isAdmin && (
          <>
            <label className="text-xs text-slate-500 flex items-center gap-1.5">
              <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
              Ver inactivos
            </label>
            <Button onClick={() => abrir('ue', null)}><Plus size={15} /> Nueva UE</Button>
          </>
        )}
      </PageHeader>
      <p className="text-sm text-slate-500 -mt-2 mb-4">
        Las 13 unidades ejecutoras del pliego 455 (la 001 es la Sede Central) y las oficinas de cada una que pueden
        firmar el documento que pide la opinión legal. Despliega una UE para ver sus oficinas.
      </p>

      <ErrorAlert>{ues.error || areas.error}</ErrorAlert>

      <div className="relative mb-3 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input className="pl-9" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar UE u oficina…" aria-label="Buscar unidad ejecutora u oficina" />
      </div>

      {cargando ? (
        <div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>
      ) : !lista.length ? (
        <EmptyState icon={Landmark} title={q ? 'Sin coincidencias' : 'Aún no hay unidades ejecutoras'} />
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {lista.map((u) => {
            const abierta = abiertas.has(u.ID_UNIDAD_EJECUTORA) || (q && !u.ueCoincide);
            return (
              <div key={u.ID_UNIDAD_EJECUTORA} className={u.ACTIVO ? '' : 'opacity-60'}>
                <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50">
                  <button type="button" onClick={() => toggle(u.ID_UNIDAD_EJECUTORA)} aria-expanded={abierta}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gore-500 rounded-lg">
                    <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${abierta ? '' : '-rotate-90'}`} />
                    <span className="font-mono text-xs text-slate-500 w-9 shrink-0">{u.CODIGO || '—'}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800 truncate">{u.NOMBRE}</span>
                      <span className="block text-[11px] text-slate-400">
                        {u.SIGLA ? `${u.SIGLA} · ` : ''}{areasDe(u.ID_UNIDAD_EJECUTORA).length} oficina(s)
                      </span>
                    </span>
                  </button>
                  {!u.ACTIVO && <Badge color="#64748b">Inactiva</Badge>}
                  {isAdmin && (
                    <span className="shrink-0 whitespace-nowrap">
                      <IconButton title="Editar UE" onClick={() => abrir('ue', u)}><Pencil size={14} /></IconButton>
                      <Alternar fila={u} onClick={() => alternar(ues, u.ID_UNIDAD_EJECUTORA, !u.ACTIVO)} />
                    </span>
                  )}
                </div>

                {abierta && (
                  <div className="bg-slate-50/70 border-t border-slate-100 pl-12 pr-3 py-2">
                    {u.suyas.length ? (
                      <ul className="divide-y divide-slate-100">
                        {u.suyas.map((a) => (
                          <li key={a.ID_AREA} className={`flex items-center gap-2 py-1.5 ${a.ACTIVO ? '' : 'opacity-60'}`}>
                            <Building2 size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
                            <span className="flex-1 min-w-0 text-sm text-slate-700">
                              {a.NOMBRE}{a.SIGLA && <span className="ml-1.5 font-mono text-[11px] text-slate-400">{a.SIGLA}</span>}
                            </span>
                            {!a.ACTIVO && <Badge color="#64748b">Inactiva</Badge>}
                            {isAdmin && (
                              <>
                                <IconButton title="Editar oficina" onClick={() => abrir('area', a)}><Pencil size={13} /></IconButton>
                                <Alternar fila={a} onClick={() => alternar(areas, a.ID_AREA, !a.ACTIVO)} />
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-xs text-slate-400 py-1.5">Sin oficinas registradas.</p>}
                    {isAdmin && (
                      <button type="button" onClick={() => abrir('area', null, { ID_UNIDAD_EJECUTORA: u.ID_UNIDAD_EJECUTORA })}
                        className="mt-1 mb-1 inline-flex items-center gap-1 text-xs font-medium text-gore-700 hover:underline">
                        <Plus size={13} /> Agregar oficina
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <Modal
        open={isAdmin && Boolean(form)} onClose={() => setForm(null)}
        title={form?.tipo === 'ue'
          ? (form?.fila ? 'Editar unidad ejecutora' : 'Nueva unidad ejecutora')
          : (form?.fila ? 'Editar oficina' : 'Agregar oficina')}
      >
        {form && (
          <form onSubmit={enviar} className="space-y-3">
            <ErrorAlert>{errorForm}</ErrorAlert>
            {form.tipo === 'ue' ? (
              <>
                <Field label="Nombre" required>
                  <Input value={form.datos.NOMBRE ?? ''} onChange={(e) => set('NOMBRE', e.target.value)} placeholder="Dirección Regional de Salud" autoFocus />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Sigla"><Input value={form.datos.SIGLA ?? ''} onChange={(e) => set('SIGLA', e.target.value)} placeholder="DIRESA" /></Field>
                  <Field label="Número de UE" help="Solo dígitos (la 001 es la Sede Central)">
                    <Input value={form.datos.CODIGO ?? ''} onChange={(e) => set('CODIGO', e.target.value)} placeholder="400" inputMode="numeric" />
                  </Field>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500">
                  Unidad ejecutora: <strong className="text-slate-700">
                    {(ues.filas || []).find((u) => u.ID_UNIDAD_EJECUTORA === Number(form.datos.ID_UNIDAD_EJECUTORA))?.NOMBRE}
                  </strong>
                </p>
                <Field label="Nombre" required help="Se puede repetir entre UE (cada UGEL tiene su Área de Gestión Administrativa)">
                  <Input value={form.datos.NOMBRE ?? ''} onChange={(e) => set('NOMBRE', e.target.value)} placeholder="Área de Gestión Administrativa" autoFocus />
                </Field>
                <Field label="Sigla"><Input value={form.datos.SIGLA ?? ''} onChange={(e) => set('SIGLA', e.target.value)} placeholder="AGA" /></Field>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
              <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Toast toast={toast} />
    </div>
  );
};

export default UnidadesEjecutoras;
