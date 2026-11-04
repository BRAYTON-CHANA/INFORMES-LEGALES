import { useEffect, lazy } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import ProtectedRoute from '@/shared/components/ProtectedRoute';
import { AppLayout } from '@/features/layout';
import { APP_CONFIG } from '@/app/config';
import { rolesDe } from '@/app/navigation';
import { rutas } from '@/features/informes/utils/rutas';

// Las vistas siguen la jerarquía del menú: app/views/<sección>/<página>/index.jsx
import NotFound from '@/app/views/NotFound';
import Login from '@/features/login/views/Login';
import ChangePassword from '@/features/login/views/ChangePassword';

import Modulos from '@/app/views/modulos';
import Informes from '@/app/views/modulos/informes';
import FichaInforme from '@/app/views/modulos/informes/ficha';

// Páginas de uso menos frecuente: se cargan al entrar (chunk aparte; Suspense en AppLayout)
const FormularioInforme = lazy(() => import('@/app/views/modulos/informes/formulario'));
const Reportes = lazy(() => import('@/app/views/modulos/informes/reportes'));
const Configuracion = lazy(() => import('@/app/views/configuracion'));
const Usuarios = lazy(() => import('@/app/views/configuracion/usuarios'));
const Roles = lazy(() => import('@/app/views/configuracion/roles'));
const UnidadesEjecutoras = lazy(() => import('@/app/views/configuracion/unidades-ejecutoras'));
const TiposDocumento = lazy(() => import('@/app/views/configuracion/tipos-documento'));
const Materias = lazy(() => import('@/app/views/configuracion/materias'));
const Normas = lazy(() => import('@/app/views/configuracion/normas'));

const CONFIGURACION = {
  usuarios: Usuarios,
  roles: Roles,
  'unidades-ejecutoras': UnidadesEjecutoras,
  'tipos-documento': TiposDocumento,
  materias: Materias,
  normas: Normas,
};

/** Rutas anteriores (/informes/…, …/:id/ficha, /config/…) → las nuevas */
const RedirigirInforme = () => <Navigate to={rutas.ficha(useParams().id)} replace />;
const RedirigirConfig = () => <Navigate to={`/configuracion/${useParams().seccion}`} replace />;

/** Solo inician sesión la ORAJ: admin y abogados */
const ROLES_ORAJ = ['admin', 'abogado'];

/** Exige sesión de la ORAJ (y los roles de su ítem del menú, si tiene) */
const conRoles = (to, elemento) => <ProtectedRoute roles={rolesDe(to) || ROLES_ORAJ}>{elemento}</ProtectedRoute>;
const soloOraj = (elemento) => <ProtectedRoute roles={ROLES_ORAJ}>{elemento}</ProtectedRoute>;

const App = () => {
  useEffect(() => {
    document.title = `${APP_CONFIG.name} — ${APP_CONFIG.description}`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', APP_CONFIG.description);
  }, []);

  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/cambiar-contrasena" element={<ChangePassword />} />

      {/* Dentro del layout. El repositorio es público: la lista (también en /) y la ficha se ven sin
          sesión (la API solo entrega lo público y vigente); registrar, editar, reportes y
          configuración exigen sesión de la ORAJ */}
      <Route element={<AppLayout />}>
        {/* No hay página de inicio: se entra directo a los informes */}
        <Route path="/" element={<Navigate to={rutas.lista} replace />} />

        <Route path="/modulos" element={<Modulos />} />
        <Route path={rutas.lista} element={<Informes />} />
        <Route path={rutas.reportes} element={conRoles(rutas.reportes, <Reportes />)} />
        <Route path={rutas.nuevo} element={soloOraj(<FormularioInforme />)} />
        <Route path={rutas.ficha(':id')} element={<FichaInforme />} />
        <Route path={rutas.editar(':id')} element={soloOraj(<FormularioInforme />)} />
        <Route path={`${rutas.ficha(':id')}/ficha`} element={<RedirigirInforme />} />

        <Route path="/configuracion" element={soloOraj(<Configuracion />)} />
        {Object.entries(CONFIGURACION).map(([clave, Vista]) => (
          <Route key={clave} path={`/configuracion/${clave}`} element={conRoles(`/configuracion/${clave}`, <Vista />)} />
        ))}

        {/* Las oficinas ahora se ven dentro de su unidad ejecutora */}
        <Route path="/configuracion/areas" element={<Navigate to="/configuracion/unidades-ejecutoras" replace />} />
        <Route path="/informes" element={<Navigate to={rutas.lista} replace />} />
        <Route path="/informes/reportes" element={<Navigate to={rutas.reportes} replace />} />
        <Route path="/informes/:id" element={<RedirigirInforme />} />
        <Route path="/informes/:id/ficha" element={<RedirigirInforme />} />
        <Route path="/config/:seccion" element={<RedirigirConfig />} />

        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
