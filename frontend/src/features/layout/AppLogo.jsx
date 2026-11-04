import { useState } from 'react';
import { APP_CONFIG } from '@/app/config';

/**
 * Logo institucional (VITE_APP_LOGO o frontend/public/logo.png)
 * sobre recuadro blanco; si la imagen no carga, muestra "GORE".
 */
const AppLogo = ({ className = 'w-11 h-11' }) => {
  const [fallo, setFallo] = useState(false);
  return (
    <div className={`${className} rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden`}>
      {APP_CONFIG.logo && !fallo ? (
        <img src={APP_CONFIG.logo} alt="Gobierno Regional de Moquegua" className="w-full h-full object-contain p-0.5" onError={() => setFallo(true)} />
      ) : (
        <span className="text-[10px] font-extrabold tracking-tight text-gore-600">GORE</span>
      )}
    </div>
  );
};

export default AppLogo;
