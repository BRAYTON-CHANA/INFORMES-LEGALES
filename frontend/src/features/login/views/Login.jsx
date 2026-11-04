import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { useAuthContext } from '@/shared/context/AuthContext';
import { Button, Field, Input, ErrorAlert } from '@/shared/components/ui';
import { APP_CONFIG } from '@/app/config';
import AuthCard from '../components/AuthCard';

const Login = () => {
  const { login, loading, error, isAuthenticated, user } = useAuthContext();
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  // Página a la que volver tras entrar (la guardan ProtectedRoute y el botón del navbar)
  const [destino] = useState(() => sessionStorage.getItem('redirect_after_login') || '/');

  // Un solo lugar decide adónde ir con sesión: con clave temporal, directo a cambiarla
  // (sin pasar por la lista, que la API rechazaría con CAMBIO_PASSWORD)
  if (isAuthenticated) {
    return <Navigate to={user?.requiereCambioPassword ? '/cambiar-contrasena' : destino} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(dni, password);
      sessionStorage.removeItem('redirect_after_login');
    } catch {
      // el error ya está en el estado del hook
    }
  };

  return (
    <AuthCard subtitle={APP_CONFIG.description}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="DNI">
          <Input
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
            required
            autoFocus
            inputMode="numeric"
            pattern="[0-9]{8}"
            title="8 dígitos"
            placeholder="8 dígitos"
            autoComplete="username"
            className="py-2.5"
          />
        </Field>
        <Field label="Contraseña">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="py-2.5"
          />
        </Field>

        <ErrorAlert>{error}</ErrorAlert>

        <Button type="submit" disabled={loading} size="lg" className="w-full">
          {loading ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
      <div className="mt-6 flex items-center gap-3 text-[11px] uppercase tracking-wider text-slate-400" aria-hidden="true">
        <span className="h-px flex-1 bg-slate-200" /> o <span className="h-px flex-1 bg-slate-200" />
      </div>

      <Link
        to="/"
        className="group mt-4 flex items-center gap-3 rounded-2xl border border-moq-azul/25 bg-moq-azul/5 px-4 py-3 text-left transition-all hover:border-moq-azul/50 hover:bg-moq-azul/10 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moq-azul focus-visible:ring-offset-2"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-moq-azul text-white shadow-sm">
          <Search size={17} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-moq-azul">Consultar el repositorio</span>
          <span className="block text-xs text-slate-500">Busca y descarga los informes sin cuenta</span>
        </span>
        <ArrowLeft size={16} aria-hidden="true" className="shrink-0 rotate-180 text-moq-azul transition-transform group-hover:translate-x-0.5" />
      </Link>

      <p className="mt-4 text-[11px] text-slate-400 text-center leading-snug">
        La cuenta es solo para la ORAJ (administración y abogados).
      </p>
    </AuthCard>
  );
};

export default Login;
