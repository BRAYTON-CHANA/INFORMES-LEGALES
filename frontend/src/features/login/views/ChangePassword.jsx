import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/shared/context/AuthContext';
import { Button, Field, Input, ErrorAlert } from '@/shared/components/ui';
import { authService } from '../services/authService';
import AuthCard from '../components/AuthCard';

/**
 * Cambio de clave obligatorio: cuenta nueva o clave reiniciada por el admin. Es la única
 * vez que el usuario pone su clave; después, solo el admin puede reiniciarla.
 */
const ChangePassword = () => {
  const { user, isAuthenticated, patchUser, logout } = useAuthContext();
  const [nueva, setNueva] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [destino] = useState(() => sessionStorage.getItem('redirect_after_login') || '/');

  // Un solo lugar decide adónde ir: sin sesión (cerró sesión) al repositorio; ya cambiada, a donde iba
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!user?.requiereCambioPassword) return <Navigate to={destino} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (nueva !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await authService.changePassword(nueva);
      sessionStorage.removeItem('redirect_after_login');
      patchUser({ requiereCambioPassword: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Nueva contraseña">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nueva contraseña" help="Mínimo 8 caracteres">
          <Input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} required minLength={8} autoComplete="new-password" autoFocus />
        </Field>
        <Field label="Confirmar contraseña">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
        </Field>

        <ErrorAlert>{error}</ErrorAlert>

        <Button type="submit" disabled={loading} size="lg" className="w-full">
          {loading ? 'Guardando…' : 'Guardar'}
        </Button>
        <button
          type="button"
          onClick={logout}
          className="w-full text-sm text-slate-500 hover:text-slate-700"
        >
          Cerrar sesión
        </button>
      </form>
    </AuthCard>
  );
};

export default ChangePassword;
