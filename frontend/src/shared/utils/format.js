export const formatBytes = (n) => {
  if (n == null || isNaN(n)) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = Number(n);
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`;
};

export const formatFecha = (d) => {
  if (!d) return '—';
  const dateOnly = typeof d === 'string'
    ? d.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z)?$/)
    : null;
  const f = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
    : new Date(d);
  return isNaN(f) ? '—' : f.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatFechaHora = (d) => {
  if (!d) return '—';
  const f = new Date(d);
  return isNaN(f) ? '—' : f.toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
