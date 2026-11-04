import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAuthContext } from '@/shared/context/AuthContext';
import { Card } from '@/shared/components/ui';
import { seccionPorRuta, itemsVisibles } from '@/app/navigation';

/**
 * Página índice de una sección del menú (views/<seccion>/index.jsx): tarjetas de
 * sus ítems visibles, agrupadas por `sub`. Toma los datos de app/navigation.js.
 */
const SeccionIndice = ({ ruta, descripcion }) => {
  const { roles } = useAuthContext();
  const seccion = seccionPorRuta(ruta);
  const items = itemsVisibles(seccion, roles);
  const grupos = [...new Set(items.map((i) => i.sub || ''))];

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-slate-900">{seccion.title}</h1>
      {descripcion && <p className="text-slate-500 mt-1">{descripcion}</p>}

      {!items.length && <p className="text-sm text-slate-400 mt-6">No tienes accesos en esta sección.</p>}

      {grupos.map((g) => (
        <section key={g} className="mt-6">
          {g && (
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gore-700 mb-2">
              <span className="w-1 h-3.5 rounded-full bg-moq-azul" aria-hidden="true" /> {g}
            </h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.filter((i) => (i.sub || '') === g).map(({ to, label, desc, icon: Icon }) => (
              <Link key={to} to={to} className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gore-500 rounded-2xl">
                <Card className="p-4 h-full flex items-start gap-3 hover-lift group-hover:border-gore-200">
                  <span className="w-10 h-10 rounded-xl bg-gore-50 text-gore-600 flex items-center justify-center shrink-0">
                    <Icon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 font-semibold text-slate-800">
                      {label}
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-gore-600 transition-colors shrink-0" />
                    </span>
                    {desc && <span className="block text-sm text-slate-500 mt-0.5">{desc}</span>}
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default SeccionIndice;
