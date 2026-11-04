import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { db } from '@/shared/api';
import {
  Modal, Spinner, EmptyState, Badge, Button, Field, Input, ErrorAlert, PageHeader, Table, Tr, Td, IconButton,
} from '@/shared/components/ui';
import { Toast, useToast } from '@/shared/components/Toast';

/** Roles con su número de usuarios (unido en JS: /api/execute no acepta SQL libre) */
async function listarRoles() {
  const [roles, asignaciones] = await Promise.all([
    db.selectWithOrderBy('ROLES', 'NOMBRE_ROL', 'ASC', {}),
    db.select('USUARIO_ROL', {}, ['ID_ROL']),
  ]);
  const cuenta = new Map();
  for (const a of asignaciones) cuenta.set(a.ID_ROL, (cuenta.get(a.ID_ROL) || 0) + 1);
  return roles.map((r) => ({ ...r, NRO_USUARIOS: cuenta.get(r.ID_ROL) || 0 }));
}

const COLUMNAS = [
  { label: 'Rol' }, { label: 'Descripción' }, { label: 'Usuarios' }, { label: 'Estado' },
  { label: 'Acciones', className: 'text-right' },
];

const Roles = () => {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const { toast, avisar } = useToast();

  const cargar = useCallback(async () => {
    try {
      setRows(await listarRoles());
      setError(null);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const abrir = (row = null) => {
    setEditando(row);
    setForm(row
      ? { nombre_rol: row.NOMBRE_ROL, descripcion: row.DESCRIPCION || '', nivel_acceso: row.NIVEL_ACCESO }
      : { nombre_rol: '', descripcion: '', nivel_acceso: 1 });
    setModal(true);
  };

  const guardar = async () => {
    if (!form.nombre_rol?.trim()) return avisar('El nombre del rol es obligatorio', true);
    setGuardando(true);
    try {
      const data = {
        NOMBRE_ROL: form.nombre_rol.trim(),
        DESCRIPCION: form.descripcion || null,
        NIVEL_ACCESO: Number(form.nivel_acceso) || 1,
      };
      if (editando) await db.update('ROLES', editando.ID_ROL, data, 'ID_ROL');
      else await db.insert('ROLES', data);
      setModal(false);
      avisar('Rol guardado');
      cargar();
    } catch (e) {
      avisar(e.message, true);
    } finally { setGuardando(false); }
  };

  const toggleActivo = async (row) => {
    if (row.ES_SISTEMA) return avisar('Los roles de sistema no se pueden desactivar', true);
    try {
      await db.update('ROLES', row.ID_ROL, { ACTIVO: !row.ACTIVO }, 'ID_ROL');
      cargar();
    } catch (e) { avisar(e.message, true); }
  };

  return (
    <div className="p-4 sm:p-6">
      <PageHeader icon={ShieldCheck} title="Roles">
        <Button onClick={() => abrir()}><Plus size={15} /> Nuevo rol</Button>
      </PageHeader>

      <ErrorAlert>{error}</ErrorAlert>

      {rows === null ? (
        <div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Sin roles" />
      ) : (
        <Table columns={COLUMNAS}>
          {rows.map((r) => (
            <Tr key={r.ID_ROL} inactivo={!r.ACTIVO}>
              <Td>
                <Badge color={r.NOMBRE_ROL === 'admin' ? '#dc2626' : '#2563eb'}>{r.NOMBRE_ROL}</Badge>
                {r.ES_SISTEMA ? <span className="text-[10px] text-slate-400">sistema</span> : null}
              </Td>
              <Td className="text-slate-500 truncate max-w-[240px]">{r.DESCRIPCION || '—'}</Td>
              <Td>{r.NRO_USUARIOS}</Td>
              <Td><Badge color={r.ACTIVO ? '#16a34a' : '#64748b'}>{r.ACTIVO ? 'Activo' : 'Inactivo'}</Badge></Td>
              <Td className="text-right whitespace-nowrap">
                <IconButton title="Editar" onClick={() => abrir(r)}><Pencil size={14} /></IconButton>
                <IconButton title={r.ACTIVO ? 'Desactivar' : 'Activar'} className="hover:text-amber-600" onClick={() => toggleActivo(r)}>
                  {r.ACTIVO ? <ToggleRight size={16} className="text-emerald-600" /> : <ToggleLeft size={16} />}
                </IconButton>
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editando ? `Editar rol "${editando.NOMBRE_ROL}"` : 'Nuevo rol'}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre del rol" required>
              <Input value={form.nombre_rol || ''} onChange={(e) => setForm({ ...form, nombre_rol: e.target.value })}
                disabled={Boolean(editando?.ES_SISTEMA)} placeholder="supervisor" />
            </Field>
            <Field label="Nivel de acceso">
              <Input type="number" min="1" max="100" value={form.nivel_acceso ?? 1} onChange={(e) => setForm({ ...form, nivel_acceso: e.target.value })} />
            </Field>
          </div>
          <Field label="Descripción">
            <Input value={form.descripcion || ''} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} />
    </div>
  );
};

export default Roles;
