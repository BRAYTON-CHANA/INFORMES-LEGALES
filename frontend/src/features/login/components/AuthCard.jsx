import { APP_CONFIG } from '@/app/config';
import AppLogo from '@/features/layout/AppLogo';
import FranjaMoquegua from '@/features/layout/FranjaMoquegua';

/** Tarjeta centrada para las pantallas sin menú (login, cambio de clave) */
const AuthCard = ({ title, subtitle, children }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-sm bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden">
      <div className="bg-gore-600 px-8 pt-8 pb-6 flex flex-col items-center text-center text-white">
        <AppLogo className="w-16 h-16 mb-3" />
        <h1 className="text-2xl font-bold">{title || APP_CONFIG.name}</h1>
        {!title && <p className="text-[11px] uppercase tracking-wide text-white/85 mt-1 leading-snug">{APP_CONFIG.fullName}</p>}
      </div>
      <FranjaMoquegua />
      <div className="p-8 sm:px-10">
        {subtitle && <p className="text-sm text-slate-500 text-center -mt-2 mb-6">{subtitle}</p>}
        {children}
      </div>
    </div>
  </div>
);

export default AuthCard;
