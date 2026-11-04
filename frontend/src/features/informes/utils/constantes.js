/** Estado del informe: en la BD VIGENTE | ANULADO; se muestra Vigente / No vigente */
export const ESTADOS = {
  VIGENTE: { label: 'Vigente', color: '#2563eb' },
  ANULADO: { label: 'No vigente', color: '#64748b' },
};
export const estado = (v) => ESTADOS[v] || ESTADOS.VIGENTE;

/** Mismo formato que el backend (armarCodigo en lib/handlers/informes/index.js) */
export const vistaCodigo = (prefijo, numero, anio, sigla) =>
  `${prefijo || '…'} N° ${String(numero || '').padStart(3, '0')}-${anio || '….'}-${sigla}`;

export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
