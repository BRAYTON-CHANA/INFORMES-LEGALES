import { useState, useEffect, Suspense } from 'react';
import { Outlet, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, LogOut, Menu, X, PanelLeftClose, PanelLeftOpen, ChevronDown } from 'lucide-react';
import { useAuthContext } from '@/shared/context/AuthContext';
import DropdownMenu from '@/shared/components/DropdownMenu';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import { Spinner } from '@/shared/components/ui';
import { APP_CONFIG } from '@/app/config';
import { NAV_SECTIONS, itemsVisibles } from '@/app/navigation';
import AppLogo from './AppLogo';
import FranjaMoquegua from './FranjaMoquegua';

const NAV_COLLAPSED_KEY = 'app.nav.collapsed';

const leerColapsado = () => {
  try { return localStorage.getItem(NAV_COLLAPSED_KEY) === '1'; } catch { return false; }
};

/** Navbar institucional (logo, SIGEA, usuario) + menú lateral de módulos + contenido */
const AppLayout = () => {
  const { user, roles, logout, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(leerColapsado);

  useEffect(() => {
    try { localStorage.setItem(NAV_COLLAPSED_KEY, collapsed ? '1' : '0'); } catch { /* sin storage */ }
  }, [collapsed]);

  // Al salir se queda en el repositorio público
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const irAlLogin = () => {
    sessionStorage.setItem('redirect_after_login', location.pathname);
    navigate('/login');
  };

  const hide = collapsed ? 'lg:hidden' : '';

  // Ítem activo = el de ruta más específica que contiene a la actual. Así en
  // /modulos/informes/reportes se marca solo Reportes, no también Informes legales
  // (NavLink marcaría los dos, porque /modulos/informes es prefijo).
  const activo = NAV_SECTIONS.flatMap((s) => s.items)
    .filter(({ to, end }) => location.pathname === to || (!end && location.pathname.startsWith(`${to}/`)))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;

  const linkCls = (isActive) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm border-l-4 transition-all duration-200 ${
      collapsed ? 'lg:justify-center lg:px-0' : ''
    } ${
      isActive
        ? 'bg-gore-50 border-gore-600 text-gore-700 font-medium'
        : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const tituloCls = `block px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-gore-700 ${hide}`;

  const Section = ({ title, to, items }) => (
    <div>
      {collapsed && <div className="hidden lg:block mx-1 mb-2 border-t border-slate-200" />}
      {to ? (
        <NavLink to={to} end className={`${tituloCls} hover:underline`} onClick={() => setOpen(false)}>{title}</NavLink>
      ) : (
        <p className={tituloCls}>{title}</p>
      )}
      {items.map(({ to, label, icon: Icon, end, sub }, i) => (
        <div key={to}>
          {sub && sub !== items[i - 1]?.sub && (
            <p className={`px-3 mt-2 mb-0.5 text-[10px] font-medium text-slate-400 ${hide}`}>{sub}</p>
          )}
          <NavLink to={to} end={end} className={() => linkCls(to === activo)} aria-current={to === activo ? 'page' : undefined}
            title={collapsed ? label : undefined} onClick={() => setOpen(false)}>
            <Icon size={17} className="shrink-0" />
            <span className={hide}>{label}</span>
          </NavLink>
        </div>
      ))}
    </div>
  );

  const nombre = [user?.nombres, user?.apellidos].filter(Boolean).join(' ') || (user?.dni && `DNI ${user.dni}`);
  const menuItem = 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 outline-none';

  // Con clave temporal no se muestra ninguna página (tampoco las públicas): primero se cambia
  if (isAuthenticated && user?.requiereCambioPassword) return <Navigate to="/cambiar-contrasena" replace />;

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] focus:px-3 focus:py-2 focus:rounded-lg focus:bg-white focus:text-gore-700 focus:shadow-lg">
        Saltar al contenido
      </a>
      <header className="app-navbar shrink-0 relative z-50">
        <div className="h-16 bg-gore-600 text-white flex items-center gap-3 px-3 sm:px-5">
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Menú"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>

          <AppLogo />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="hidden md:block text-[11px] lg:text-xs font-medium uppercase tracking-wide text-white/90 truncate">{APP_CONFIG.fullName}</p>
            <p className="text-lg font-extrabold tracking-wide">
              {APP_CONFIG.name}
              <span className="hidden sm:inline md:hidden text-xs font-normal text-white/85"> · {APP_CONFIG.description}</span>
            </p>
          </div>

          {!isAuthenticated ? (
            <button
              onClick={irAlLogin}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-gore-700 text-sm font-semibold hover:bg-gore-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shrink-0"
            >
              <LogIn size={16} aria-hidden="true" /> <span className="hidden sm:inline">Iniciar sesión</span><span className="sm:hidden">Ingresar</span>
            </button>
          ) : (
          <DropdownMenu
            menuClassName="w-56"
            trigger={({ triggerRef, open: abierto, toggle }) => (
              <button
                ref={triggerRef}
                onClick={toggle}
                aria-haspopup="menu"
                aria-expanded={abierto}
                className="flex items-center gap-2.5 pl-2 pr-1.5 py-1 rounded-lg hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white min-w-0"
              >
                <span className="hidden sm:block text-right min-w-0">
                  <span className="block text-sm font-semibold truncate max-w-56">{nombre}</span>
                  <span className="block text-[11px] text-white/80 truncate max-w-56">{roles.join(', ') || 'sin rol'}</span>
                </span>
                <span className="w-9 h-9 rounded-full bg-white text-gore-700 flex items-center justify-center text-sm font-bold shrink-0">
                  {(nombre || 'U')[0].toUpperCase()}
                </span>
                <ChevronDown size={15} className="shrink-0 text-white/80" />
              </button>
            )}
          >
            {({ close }) => (
              <>
                <div className="px-3 py-2 border-b border-slate-100 sm:hidden">
                  <p className="text-sm font-semibold text-slate-800 truncate">{nombre}</p>
                  <p className="text-xs text-slate-500 truncate">{roles.join(', ') || 'sin rol'}</p>
                </div>
                <button role="menuitem" className={`${menuItem} text-gore-700`} onClick={() => { close(); handleLogout(); }}>
                  <LogOut size={15} /> Cerrar sesión
                </button>
              </>
            )}
          </DropdownMenu>
          )}
        </div>
        <FranjaMoquegua />
      </header>

      <div className="flex-1 min-h-0 flex relative">
        <aside
          className={`absolute lg:relative inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 transform transition-[width,transform] duration-200 lg:translate-x-0 ${
            collapsed ? 'lg:w-17' : ''
          } ${open ? 'translate-x-0 shadow-xl lg:shadow-none' : '-translate-x-full'}`}
        >
          <nav className={`flex-1 overflow-y-auto px-3 py-4 space-y-5 ${collapsed ? 'lg:px-2' : ''}`}>
            {NAV_SECTIONS.map((s) => ({ ...s, items: itemsVisibles(s, roles) })).filter((s) => s.items.length).map((s) => (
              <Section key={s.title} title={s.title} to={s.to} items={s.items} />
            ))}
          </nav>

          <div className={`hidden lg:flex px-3 py-2 border-t border-slate-200 ${collapsed ? 'justify-center' : 'justify-end'}`}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-gore-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gore-500"
              title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
              aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
          </div>
        </aside>

        {/* Fondo del cajón en móvil (con teclado se cierra con el botón de menú) */}
        {open && (
          <div className="lg:hidden absolute inset-0 z-30 bg-black/40 backdrop-blur-sm animate-fade-in" aria-hidden="true" onClick={() => setOpen(false)} />
        )}

        <main id="contenido" className="flex-1 min-w-0 h-full overflow-y-auto">
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<div className="flex justify-center py-16"><Spinner className="w-7 h-7" /></div>}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
