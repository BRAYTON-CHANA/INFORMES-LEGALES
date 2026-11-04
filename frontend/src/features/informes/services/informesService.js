import { apiFetch } from '@/shared/api';

/** API del repositorio de informes (lib/handlers/informes/) */
export const informesService = {
  listar: (filtros = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(filtros)) if (v !== '' && v != null) q.set(k, v);
    return apiFetch(`/informes${q.size ? `?${q}` : ''}`);
  },
  catalogos: () => apiFetch('/informes/catalogos'),
  reportes: ({ desde, hasta } = {}) => {
    const q = new URLSearchParams();
    if (desde) q.set('desde', desde);
    if (hasta) q.set('hasta', hasta);
    return apiFetch(`/informes/reportes${q.size ? `?${q}` : ''}`);
  },
  siguienteNumero: (tipo, anio) => apiFetch(`/informes/siguiente-numero?tipo=${tipo}&anio=${anio}`),
  obtener: (id) => apiFetch(`/informes/${id}`),
  crear: (informe) => apiFetch('/informes', { method: 'POST', body: informe }),
  actualizar: (id, informe) => apiFetch(`/informes/${id}`, { method: 'PUT', body: informe }),
  eliminar: (id) => apiFetch(`/informes/${id}`, { method: 'DELETE' }),
  anular: (id, motivo) => apiFetch(`/informes/${id}/anular`, { method: 'POST', body: { MOTIVO: motivo } }),
  /** true = público (lo ven todos los usuarios), false = privado (quien lo registró y el admin) */
  publicar: (id, publicar) => apiFetch(`/informes/${id}/publicar`, { method: 'POST', body: { publicar } }),

  /** PDF nuevo (otra versión): categoria 'OFICIAL' (informe firmado) | 'SOLICITUD' (documento de origen con sus anexos) */
  subirArchivo: (id, file, categoria = 'OFICIAL') => {
    const fd = new FormData();
    fd.append('categoria', categoria);
    fd.append('archivo', file);
    return apiFetch(`/informes/${id}/archivos`, { method: 'POST', body: fd });
  },

  /** Descarga (o abre en otra pestaña si `inline`) un archivo con el JWT */
  abrirArchivo: async (id, archivo, inline = false) => {
    // La pestaña se abre ya (en el clic), si no el navegador la bloquea tras esperar la descarga
    const pestana = inline ? window.open('', '_blank') : null;
    if (pestana) pestana.opener = null;
    const res = await apiFetch(`/informes/${id}/archivos/${archivo.ID_ARCHIVO}${inline ? '?inline=1' : ''}`, { raw: true });
    if (!res.ok) {
      pestana?.close();
      let message = `Error ${res.status}`;
      try { message = (await res.json()).message || message; } catch { /* sin cuerpo JSON */ }
      throw new Error(message);
    }
    const url = URL.createObjectURL(await res.blob());
    if (inline) {
      if (pestana) pestana.location.href = url;
      else window.open(url, '_blank', 'noopener');
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = archivo.NOMBRE_ORIGINAL;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
