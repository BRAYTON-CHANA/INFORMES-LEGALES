import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, ToggleLeft, ToggleRight, ChevronRight } from 'lucide-react';
import {
  Modal, Spinner, EmptyState, Badge, Button, ErrorAlert, PageHeader, Table, Tr, Td, IconButton,
} from '@/shared/components/ui';
import { Toast, useToast } from '@/shared/components/Toast';
import { useAuthContext } from '@/shared/context/AuthContext';
import { useCatalogo } from '../hooks/useCatalogo';

/**
 * Página de un catálogo de Configuración. Cada página declara lo suyo:
 *   clave, pk:  clave en /api/catalogos y su columna ID
 *   columnas:  [{ label, render(fila), className? }]
 *   vacio:      () => datos iniciales del formulario
 *   Formulario: ({ datos, set }) => campos en JSX (set(col, valor))
 * El servidor valida (obligatorios, duplicados); aquí se muestra su mensaje.
 * Solo el admin crea, edita, desactiva y ve los inactivos; los abogados la ven en modo lectura.
 */
const CatalogoPagina = ({ clave, pk, titulo, icono, descripcion, singular, columnas, vacio, Formulario }) => {
  const { isAdmin } = useAuthContext();
  const { filas, error, verInactivos, setVerInactivos, guardar, alternarActivo } = useCatalogo(clave);
  const [editando, setEditando] = useState(undefined); // undefined = cerrado, null = nuevo, fila = editar
  const [datos, setDatos] = useState({});
  const [errorForm, setErrorForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const { toast, avisar } = useToast();

  const idDe = (f) => f[pk];

  const abrir = (fila = null) => {
    setEditando(fila);
    setDatos(fila ? { ...fila } : vacio());
    setErrorForm(null);
  };
  const set = (col, v) => setDatos((d) => ({ ...d, [col]: v }));

  const enviar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await guardar(editando ? idDe(editando) : null, datos);
      avisar(editando ? 'Cambios guardados' : `${singular} creado(a)`);
      setEditando(undefined);
    } catch (err) {
      setErrorForm(err.message);
    } finally { setGuardando(false); }
  };

  const alternar = async (fila) => {
    try { await alternarActivo(idDe(fila), !fila.ACTIVO); } catch (err) { avisar(err.message, true); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <nav className="flex items-center gap-1 text-xs text-slate-400 mb-2" aria-label="Ruta">
        <Link to="/configuracion" className="hover:text-gore-600">Configuración</Link>
        <ChevronRight size={12} />
        <span className="text-slate-500">{titulo}</span>
      </nav>
      <PageHeader icon={icono} title={titulo}>
        {isAdmin && (
          <>
            <label className="text-xs text-slate-500 flex items-center gap-1.5">
              <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
              Ver inactivos
            </label>
            <Button onClick={() => abrir()}><Plus size={15} /> Nuevo</Button>
          </>
        )}
      </PageHeader>
      {descripcion && <p className="text-sm text-slate-500 -mt-2 mb-4">{descripcion}</p>}

      <ErrorAlert>{error}</ErrorAlert>

      {filas === null ? (
        <div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>
      ) : filas.length === 0 ? (
        <EmptyState icon={icono} title="Aún no hay registros" subtitle={isAdmin ? 'Crea el primero con el botón Nuevo' : undefined} />
      ) : (
        <Table columns={isAdmin ? [...columnas, { label: 'Estado' }, { label: 'Acciones', className: 'text-right' }] : columnas}>
          {filas.map((f) => (
            <Tr key={idDe(f)} inactivo={!f.ACTIVO}>
              {columnas.map((c) => <Td key={c.label} className={c.className}>{c.render(f) ?? '—'}</Td>)}
              {isAdmin && <Td><Badge color={f.ACTIVO ? '#15803d' : '#64748b'}>{f.ACTIVO ? 'Activo' : 'Inactivo'}</Badge></Td>}
              {isAdmin && <Td className="text-right whitespace-nowrap">
                <IconButton title="Editar" onClick={() => abrir(f)}><Pencil size={14} /></IconButton>
                <IconButton title={f.ACTIVO ? 'Desactivar' : 'Activar'} className="hover:text-amber-600" onClick={() => alternar(f)}>
                  {f.ACTIVO ? <ToggleRight size={16} className="text-moq-verde" /> : <ToggleLeft size={16} />}
                </IconButton>
              </Td>}
            </Tr>
          ))}
        </Table>
      )}

      <Modal open={isAdmin && editando !== undefined} onClose={() => setEditando(undefined)} title={editando ? `Editar ${singular.toLowerCase()}` : `Nuevo(a) ${singular.toLowerCase()}`}>
        <form onSubmit={enviar} className="space-y-3">
          <ErrorAlert>{errorForm}</ErrorAlert>
          <Formulario datos={datos} set={set} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditando(undefined)}>Cancelar</Button>
            <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>

      <Toast toast={toast} />
    </div>
  );
};

export default CatalogoPagina;
