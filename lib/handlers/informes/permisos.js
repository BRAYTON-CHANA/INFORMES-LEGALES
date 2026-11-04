/**
 * Permisos sobre informes: ÚNICO lugar donde se decide quién ve o edita.
 *
 *  - Solo inician sesión admin y abogados (ROLES_EDICION): registran y publican.
 *  - Cada informe es Público (PUBLICADO = true) o Privado:
 *      · Público y vigente → lo ve cualquiera, también sin sesión (repositorio público: req.user = null).
 *      · Privado (o anulado) → solo quien lo registró y el administrador.
 *  - Editar, eliminar, anular y cambiar público/privado: solo quien lo registró y el administrador.
 */
import { esAdmin } from '../../shared/http.js';

export const ROLES_EDICION = ['admin', 'abogado'];

/** Puede registrar informes (y ver los reportes) */
export const puedeRegistrar = (user) => esAdmin(user) || (user?.roles || []).some((r) => ROLES_EDICION.includes(r));

/** Quien registró el informe */
export const esDueno = (user, inf) => Boolean(user?.id_usuario) && inf?.ID_USUARIO_REGISTRO === user.id_usuario;

/** Filtros del informe visible para todos los usuarios */
export const FILTROS_PUBLICO = [
  { field: 'PUBLICADO', op: '=', value: true },
  { field: 'ESTADO', op: '=', value: 'VIGENTE' },
];

const esPublico = (inf) => Boolean(inf.PUBLICADO) && inf.ESTADO === 'VIGENTE';

/** { ver, editar, admin, registrar } del usuario sobre un informe (null = no existe) */
export function permisosInforme(user, informe) {
  const admin = esAdmin(user);
  const registrar = puedeRegistrar(user);
  if (!informe) return { ver: false, editar: false, admin, registrar };
  const editar = admin || esDueno(user, informe);
  return { ver: editar || esPublico(informe), editar, admin, registrar };
}

/** Filtros extra para el listado: lo que el usuario puede ver, ya resuelto en SQL */
export function filtrosVisibilidad(user) {
  if (!user) return FILTROS_PUBLICO;
  if (esAdmin(user)) return [];
  return [{ or: [FILTROS_PUBLICO, [{ field: 'ID_USUARIO_REGISTRO', op: '=', value: user.id_usuario }]] }];
}
