import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/shared/context/AuthContext';

/** Exige sesión; con soloAdmin, además rol admin; con roles, alguno de ellos */
const ProtectedRoute = ({ children, soloAdmin = false, roles: permitidos }) => {
  const { isAuthenticated, isAdmin, roles, user } = useAuthContext();
  const location = useLocation();

  if (!isAuthenticated) {
    sessionStorage.setItem('redirect_after_login', location.pathname);
    return <Navigate to="/login" replace />;
  }
  if (user?.requiereCambioPassword) return <Navigate to="/cambiar-contrasena" replace />;
  if (soloAdmin && !isAdmin) return <Navigate to="/" replace />;
  if (permitidos && !isAdmin && !permitidos.some((r) => roles.includes(r))) return <Navigate to="/" replace />;

  return children;
};

export default ProtectedRoute;
