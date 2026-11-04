import { useState, useEffect, useCallback } from 'react';
import { catalogosService } from '../services/catalogosService';

/**
 * Estado de un catálogo: filas, filtro de inactivos, guardar y activar/desactivar.
 * Los errores de validación (400/409) vienen del servidor con su mensaje.
 */
export function useCatalogo(clave) {
  const [filas, setFilas] = useState(null);
  const [error, setError] = useState(null);
  const [verInactivos, setVerInactivos] = useState(false);

  const recargar = useCallback(async () => {
    try {
      setFilas(await catalogosService.listar(clave, { inactivos: verInactivos }));
      setError(null);
    } catch (e) { setError(e.message); }
  }, [clave, verInactivos]);

  useEffect(() => { recargar(); }, [recargar]);

  /** id null = crear. Lanza el error para que el formulario lo muestre */
  const guardar = async (id, datos) => {
    const r = id ? await catalogosService.actualizar(clave, id, datos) : await catalogosService.crear(clave, datos);
    await recargar();
    return r;
  };

  const alternarActivo = async (id, activo) => {
    await catalogosService.activar(clave, id, activo);
    await recargar();
  };

  return { filas, error, verInactivos, setVerInactivos, guardar, alternarActivo, recargar };
}
