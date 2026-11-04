import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Aviso flotante simple.
 *   const { toast, avisar } = useToast();
 *   avisar('Guardado'); avisar('Falló', true);
 *   <Toast toast={toast} />
 */
export const useToast = (ms = 4000) => {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  const avisar = useCallback((msg, esError = false) => {
    clearTimeout(timer.current);
    setToast({ msg, esError });
    timer.current = setTimeout(() => setToast(null), ms);
  }, [ms]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { toast, avisar };
};

export const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div
      role="status"
      className={`fixed bottom-5 right-5 left-5 sm:left-auto z-[60] px-4 py-3 rounded-xl shadow-xl text-sm text-white animate-slide-up ${
        toast.esError ? 'bg-red-600' : 'bg-slate-800'
      }`}
    >
      {toast.msg}
    </div>
  );
};

export default Toast;
