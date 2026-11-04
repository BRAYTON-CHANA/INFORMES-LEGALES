import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Pencil, KeyRound, ToggleLeft, ToggleRight, MoreVertical, Copy, Check } from 'lucide-react';
import DropdownMenu from '@/shared/components/DropdownMenu';
import { db } from '@/shared/api';
import { authService } from '@/features/login/services/authService';
import { useAuthContext } from '@/shared/context/AuthContext';
import {
  Modal, Spinner, EmptyState, Badge, Button, Field, Input, ErrorAlert, PageHeader, Table, Tr, Td,
} from '@/shared/components/ui';
import { Toast, useToast } from '@/shared/components/Toast';

// VW_USUARIOS: cuentas sin PASSWORD_HASH (la clave nunca llega al navegador). Las cuentas son
// solo de la ORAJ (Sede Central, la asigna el backend al crear), así que no se pide ni muestra la UE
const CAMPOS_USUARIO = [
  'ID_USUARIO', 'NOMBRES', 'APELLIDOS', 'EMAIL', 'DNI', 'ACTIVO', 'REQUIERE_CAMBIO_PASSWORD', 'BLOQUEADO_HASTA',
];

const COLUMNAS = [
  { label: 'DNI' }, { label: 'Nombre' },
  { label: 'Email', className: 'hidden md:table-cell' },
  { label: 'Roles' }, { label: 'Estado' }, { label: 'Acciones', className: 'text-right' },
];

const menuItem = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 outline-none';

const Usuarios = () => {
  const { user: yo } = useAuthContext();
  const [rows, setRows] = useState(null);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});
  const [rolesSel, setRolesSel] = useState(new Set());
  const [guardando, setGuardando] = useState(false);
  const [temporal, setTemporal] = useState(null); // { dni, nombre, clave, nuevo } tras crear o reiniciar
  const [reiniciar, setReiniciar] = useState(null); // usuario a reiniciar (confirmación)
  const [copiada, setCopiada] = useState(false);
  const { toast, avisar } = useToast();

  const cargar = useCallback(async () => {
    try {
      const [usuarios, asignaciones, todosRoles] = await Promise.all([
        db.selectWithOrderBy('VW_USUARIOS', 'NOMBRES', 'ASC', {}, CAMPOS_USUARIO),
        db.select('USUARIO_ROL', {}, ['ID_USUARIO', 'ID_ROL']),
        db.select('ROLES'),
      ]);
      const nombreRol = Object.fromEntries(todosRoles.map((r) => [r.ID_ROL, r.NOMBRE_ROL]));
      setRows(usuarios.map((u) => ({
        ...u,
        ROLES: asignaciones.filter((a) => a.ID_USUARIO === u.ID_USUARIO).map((a) => nombreRol[a.ID_ROL]).filter(Boolean),
      })));
      setRoles(todosRoles.filter((r) => r.ACTIVO));
      setError(null);
    } catch (e) { setError(e.message); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const set = (campo) => (e) => setForm((prev) => ({ ...prev, [campo]: e.target.value }));

  const abrir = async (row = null) => {
    setEditando(row);
    setForm(row
      ? {
        nombres: row.NOMBRES, apellidos: row.APELLIDOS || '', email: row.EMAIL || '',
        dni: row.DNI || '',
      }
      : {});
    setRolesSel(new Set());
    if (row) {
      try {
        const ur = await db.select('USUARIO_ROL', { ID_USUARIO: row.ID_USUARIO });
        setRolesSel(new Set(ur.map((r) => r.ID_ROL)));
      } catch { /* sin roles */ }
    }
    setModal(true);
  };

  const toggleRol = (id) => {
    const s = new Set(rolesSel);
    if (s.has(id)) s.delete(id); else s.add(id);
    setRolesSel(s);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      if (editando) {
        await db.update('USUARIOS', editando.ID_USUARIO, {
          NOMBRES: form.nombres,
          APELLIDOS: form.apellidos || null,
          EMAIL: form.email?.trim().toLowerCase() || null,
          DNI: form.dni,
          FECHA_EDICION: new Date().toISOString(),
        }, 'ID_USUARIO');
        // Sincronizar roles
        const actuales = await db.select('USUARIO_ROL', { ID_USUARIO: editando.ID_USUARIO });
        for (const ur of actuales) {
          if (!rolesSel.has(ur.ID_ROL)) await db.delete('USUARIO_ROL', ur.ID_USUARIO_ROL, 'ID_USUARIO_ROL');
        }
        for (const idRol of rolesSel) {
          if (!actuales.some((ur) => ur.ID_ROL === idRol)) {
            await db.insert('USUARIO_ROL', { ID_USUARIO: editando.ID_USUARIO, ID_ROL: idRol, ASIGNADO_POR: yo?.id_usuario });
          }
        }
        avisar('Usuario actualizado');
      } else {
        // La clave la genera el sistema y se muestra una sola vez (como al reiniciarla)
        const { passwordTemporal } = await authService.register({
          nombres: form.nombres,
          apellidos: form.apellidos,
          email: form.email,
          dni: form.dni,
          id_roles: [...rolesSel],
        });
        setCopiada(false);
        setTemporal({
          dni: form.dni, nombre: [form.nombres, form.apellidos].filter(Boolean).join(' '), clave: passwordTemporal, nuevo: true,
        });
      }
      setModal(false);
      cargar();
    } catch (e) {
      avisar(e.message, true);
    } finally { setGuardando(false); }
  };

  const toggleActivo = async (row) => {
    if (row.ID_USUARIO === yo?.id_usuario) return avisar('No puedes desactivar tu propio usuario', true);
    try {
      await db.update('USUARIOS', row.ID_USUARIO, { ACTIVO: !row.ACTIVO }, 'ID_USUARIO');
      cargar();
    } catch (e) { avisar(e.message, true); }
  };

  // Solo el admin reinicia: clave al azar que se muestra una vez; el usuario pone la suya al entrar
  const confirmarReinicio = async () => {
    const row = reiniciar;
    setGuardando(true);
    try {
      const { passwordTemporal } = await authService.resetPasswordAdmin(row.ID_USUARIO);
      setReiniciar(null);
      setCopiada(false);
      setTemporal({ dni: row.DNI, nombre: [row.NOMBRES, row.APELLIDOS].filter(Boolean).join(' '), clave: passwordTemporal });
      cargar();
    } catch (e) { avisar(e.message, true); } finally { setGuardando(false); }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(temporal.clave);
      setCopiada(true);
    } catch { avisar('No se pudo copiar: selecciónala y cópiala a mano', true); }
  };

  const dniValido = /^\d{8}$/.test(form.dni || '');
  const puedeGuardar = form.nombres && dniValido && (editando || rolesSel.size > 0);

  return (
    <div className="p-4 sm:p-6">
      <PageHeader icon={Users} title="Usuarios">
        <Button onClick={() => abrir()}><Plus size={15} /> Nuevo usuario</Button>
      </PageHeader>

      <ErrorAlert>{error}</ErrorAlert>

      {rows === null ? (
        <div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="Sin usuarios" />
      ) : (
        <Table columns={COLUMNAS}>
          {rows.map((u) => (
            <Tr key={u.ID_USUARIO} inactivo={!u.ACTIVO}>
              <Td className="font-mono text-xs">{u.DNI}</Td>
              <Td>
                <span className="font-medium">{u.NOMBRES} {u.APELLIDOS || ''}</span>
                {u.REQUIERE_CAMBIO_PASSWORD ? <span className="block text-[10px] text-amber-600">Debe cambiar clave</span> : null}
                {u.BLOQUEADO_HASTA && new Date(u.BLOQUEADO_HASTA) > new Date()
                  ? <span className="block text-[10px] text-red-600">Bloqueado por intentos fallidos</span> : null}
              </Td>
              <Td className="hidden md:table-cell text-slate-500">{u.EMAIL || '—'}</Td>
              <Td>
                {u.ROLES.length
                  ? u.ROLES.map((r) => <Badge key={r} color={r === 'admin' ? '#dc2626' : '#2563eb'}>{r}</Badge>)
                  : <span className="text-slate-400 text-xs">sin rol</span>}
              </Td>
              <Td><Badge color={u.ACTIVO ? '#16a34a' : '#64748b'}>{u.ACTIVO ? 'Activo' : 'Inactivo'}</Badge></Td>
              <Td className="text-right whitespace-nowrap">
                <DropdownMenu
                  menuClassName="w-56 py-1"
                  trigger={({ triggerRef, open, toggle }) => (
                    <button ref={triggerRef} type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open}
                      aria-label={`Acciones de ${u.NOMBRES}`} title="Acciones"
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gore-500">
                      <MoreVertical size={18} />
                    </button>
                  )}
                >
                  {({ close }) => (
                    <>
                      <button role="menuitem" className={menuItem} onClick={() => { close(); abrir(u); }}>
                        <Pencil size={15} /> Editar
                      </button>
                      <button role="menuitem" className={menuItem} onClick={() => { close(); setReiniciar(u); }}>
                        <KeyRound size={15} /> Reiniciar contraseña
                      </button>
                      <button role="menuitem" className={menuItem} onClick={() => { close(); toggleActivo(u); }}>
                        {u.ACTIVO ? <><ToggleLeft size={15} /> Desactivar</> : <><ToggleRight size={15} /> Activar</>}
                      </button>
                    </>
                  )}
                </DropdownMenu>
              </Td>
            </Tr>
          ))}
        </Table>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editando ? 'Editar usuario' : 'Nuevo usuario'}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="DNI" required help="Con su DNI entra al sistema">
              <Input value={form.dni || ''} onChange={(e) => setForm((p) => ({ ...p, dni: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                inputMode="numeric" placeholder="8 dígitos" autoComplete="off" />
            </Field>
            <Field label="Nombres" required>
              <Input value={form.nombres || ''} onChange={set('nombres')} />
            </Field>
            <Field label="Apellidos">
              <Input value={form.apellidos || ''} onChange={set('apellidos')} />
            </Field>
          </div>
          <Field label="Email" help="Opcional, solo de contacto">
            <Input type="email" value={form.email || ''} onChange={set('email')} />
          </Field>
          <Field label="Roles" required={!editando} help={editando ? undefined : 'Elige al menos uno'}>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <label key={r.ID_ROL} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs cursor-pointer ${
                  rolesSel.has(r.ID_ROL)
                    ? 'bg-gore-50 border-gore-300 text-gore-700'
                    : 'border-slate-200 text-slate-600'
                }`}>
                  <input type="checkbox" className="hidden" checked={rolesSel.has(r.ID_ROL)} onChange={() => toggleRol(r.ID_ROL)} />
                  {r.NOMBRE_ROL}
                </label>
              ))}
            </div>
          </Field>
          {!editando && (
            <p className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-600">
              <KeyRound size={14} className="shrink-0 mt-px text-moq-azul" aria-hidden="true" />
              La clave la genera el sistema y se muestra una sola vez al guardar. Al entrar, la persona pondrá la suya.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={guardando || !puedeGuardar}>
              {guardando ? 'Guardando…' : editando ? 'Guardar' : 'Crear y generar clave'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(reiniciar)} onClose={() => setReiniciar(null)} title="Reiniciar contraseña">
        <p className="text-sm text-slate-600">
          Se generará una clave al azar para <strong>{reiniciar?.NOMBRES} {reiniciar?.APELLIDOS || ''}</strong> (DNI {reiniciar?.DNI}).
          Su clave actual deja de servir y, al entrar con la nueva, tendrá que poner la suya.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={() => setReiniciar(null)}>Cancelar</Button>
          <Button onClick={confirmarReinicio} disabled={guardando}><KeyRound size={15} /> Reiniciar</Button>
        </div>
      </Modal>

      <Modal open={Boolean(temporal)} onClose={() => setTemporal(null)} title={temporal?.nuevo ? 'Usuario creado' : 'Clave temporal'}>
        <p className="text-sm text-slate-600 mb-3">
          {temporal?.nuevo && <>La cuenta ya está activa: entra con su DNI y esta clave. </>}
          Entrégale esta clave a <strong>{temporal?.nombre}</strong> (DNI {temporal?.dni}).
          <strong> Se muestra una sola vez</strong>: cópiala ahora. Al entrar, el sistema le pedirá poner su propia clave.
        </p>
        <div className="flex items-center gap-2">
          <p className="flex-1 font-mono text-lg text-center tracking-wider bg-slate-100 rounded-xl py-3 select-all">{temporal?.clave}</p>
          <Button variant="secondary" onClick={copiar} aria-label="Copiar clave">
            {copiada ? <><Check size={15} /> Copiada</> : <><Copy size={15} /> Copiar</>}
          </Button>
        </div>
        <div className="flex justify-end pt-4"><Button onClick={() => setTemporal(null)}>Listo</Button></div>
      </Modal>

      <Toast toast={toast} />
    </div>
  );
};

export default Usuarios;
