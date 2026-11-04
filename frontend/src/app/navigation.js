import { Users, ShieldCheck, FileText, Files, BookOpen, Landmark, Scale, BarChart3 } from 'lucide-react';
import { rutas as informes } from '@/features/informes/utils/rutas';

const ROLES_EDICION = ['admin', 'abogado'];

/**
 * Menú lateral. Es la misma jerarquía que app/views/ (carpeta + index.jsx por sección):
 *   { title, to?, items: [{ to, label, icon, desc?, end?, sub?, roles? }] }
 * `to` de la sección = su página índice (views/<seccion>/index.jsx), que muestra los
 * ítems con su `desc`. `roles` limita quién ve el ítem (la API igual valida); una
 * sección sin ítems visibles no se muestra. `sub` agrupa ítems bajo un subtítulo.
 * Para agregar una página: su carpeta en views/, su <Route> en App.jsx y su ítem aquí.
 */
export const NAV_SECTIONS = [
  {
    title: 'Módulos',
    to: '/modulos',
    items: [
      { to: informes.lista, label: 'Informes legales', icon: FileText, sub: 'Asesoría Jurídica',
        desc: 'Buscar, consultar y descargar los informes legales de la ORAJ' },
      { to: informes.reportes, label: 'Reportes', icon: BarChart3, sub: 'Asesoría Jurídica', roles: ROLES_EDICION,
        desc: 'Uso del repositorio por unidad ejecutora y qué falta sistematizar' },
    ],
  },
  {
    title: 'Configuración',
    to: '/configuracion',
    items: [
      { to: '/configuracion/usuarios', label: 'Usuarios', icon: Users, sub: 'Acceso', roles: ['admin'],
        desc: 'Cuentas por DNI, unidad ejecutora, roles y claves' },
      { to: '/configuracion/roles', label: 'Roles', icon: ShieldCheck, sub: 'Acceso', roles: ['admin'],
        desc: 'Perfiles de acceso al sistema' },
      { to: '/configuracion/unidades-ejecutoras', label: 'Unidades ejecutoras', icon: Landmark, sub: 'Organización', roles: ROLES_EDICION,
        desc: 'Las UE del pliego y sus oficinas o áreas' },
      { to: '/configuracion/tipos-documento', label: 'Tipos de documento', icon: Files, sub: 'Informes', roles: ROLES_EDICION,
        desc: 'Tipos y prefijo del código de cada informe' },
      { to: '/configuracion/materias', label: 'Materias', icon: BookOpen, sub: 'Informes', roles: ROLES_EDICION,
        desc: 'Clasificación temática de los informes' },
      { to: '/configuracion/normas', label: 'Normas', icon: Scale, sub: 'Informes', roles: ROLES_EDICION,
        desc: 'Catálogo para la normativa asociada' },    ],
  },
];

/** Ítems de una sección que el usuario puede ver */
export const itemsVisibles = (seccion, roles = []) =>
  seccion.items.filter((i) => !i.roles || i.roles.some((r) => roles.includes(r)));

/** Roles del ítem con esa ruta (para proteger su <Route> con lo mismo que el menú) */
export const rolesDe = (to) => NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.to === to)?.roles;

/** Sección por su ruta índice ('/modulos', '/configuracion') */
export const seccionPorRuta = (to) => NAV_SECTIONS.find((s) => s.to === to);
