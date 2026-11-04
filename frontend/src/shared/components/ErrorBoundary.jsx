import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Atrapa errores de render de una página para que no quede la pantalla en blanco.
 * Usar con `key` (p. ej. la ruta) para que se reinicie al navegar.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ui] Error de render:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="p-6 max-w-lg mx-auto mt-10 text-center">
        <AlertTriangle size={36} className="mx-auto text-gore-600 mb-3" />
        <h1 className="text-lg font-semibold text-slate-900">Algo salió mal en esta página</h1>
        <p className="text-sm text-slate-500 mt-1">Vuelve a intentarlo. Si el problema sigue, avisa al administrador.</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="mt-4 px-4 py-2 rounded-xl bg-gore-600 text-white text-sm font-medium hover:bg-gore-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gore-500 focus-visible:ring-offset-2"
        >
          Reintentar
        </button>
      </div>
    );
  }
}
