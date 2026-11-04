/** Rutas de las páginas del módulo (app/views/modulos/informes/); no son las de la API */
const BASE = '/modulos/informes';

export const rutas = {
  lista: BASE,
  reportes: `${BASE}/reportes`,
  nuevo: `${BASE}/nuevo`,
  ficha: (id) => `${BASE}/${id}`, // única página del informe (consulta, impresión y gestión)
  editar: (id) => `${BASE}/${id}/editar`,
};
