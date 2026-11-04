import { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Printer, Pencil, Trash2, Ban, Globe, Lock, History, FileText, MessageSquareText, Eye, Download,
} from 'lucide-react';
import { Button, Badge, Card, ErrorAlert, Spinner, Modal, Field, Textarea, IconButton } from '@/shared/components/ui';
import { Toast, useToast } from '@/shared/components/Toast';
import { formatFechaHora, formatBytes } from '@/shared/utils/format';
import { APP_CONFIG } from '@/app/config';
import { informesService } from '@/features/informes/services/informesService';
import FichaContenido from '@/features/informes/components/FichaContenido';
import { estado } from '@/features/informes/utils/constantes';
import { rutas } from '@/features/informes/utils/rutas';

const ACCIONES = {
  CREAR: 'Registró el informe',
  EDITAR: 'Editó datos',
  SUBIR_ARCHIVO: 'Subió archivo',
  QUITAR_ANTECEDENTE: 'Quitó un anexo', // historial anterior a la migración 013
  DESCARGAR: 'Descargó / abrió archivo',
  VER: 'Consultó la ficha',
  ANULAR: 'Lo marcó como no vigente',
  PUBLICAR: 'Lo hizo público',
  RETIRAR: 'Lo hizo privado',
  COMPARTIR: 'Compartió con',
  DEJAR_DE_COMPARTIR: 'Dejó de compartir',
};

/** Versiones de un documento (la actual primero), solo lectura */
const Versiones = ({ archivos, onAbrir }) => (
  <ul className="divide-y divide-slate-100">
    {archivos.map((a) => (
      <li key={a.ID_ARCHIVO} className="py-2.5 flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-slate-500 w-8">v{a.VERSION}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-800 truncate">
            {a.NOMBRE_ORIGINAL} {a.ES_PRINCIPAL && <Badge color="#2563eb">Actual</Badge>}
          </p>
          <p className="text-[11px] text-slate-400">{formatBytes(a.TAMANIO)} · {a.SUBIDO_POR} · {formatFechaHora(a.FECHA_SUBIDA)}</p>
          <p className="text-[10px] font-mono text-slate-400 truncate" title="SHA-256">SHA-256 {a.HASH_SHA256}</p>
        </div>
        {a.TIPO_MIME === 'application/pdf' && <IconButton title="Ver" onClick={() => onAbrir(a, true)}><Eye size={16} /></IconButton>}
        <IconButton title="Descargar" onClick={() => onAbrir(a, false)}><Download size={16} /></IconButton>
      </li>
    ))}
  </ul>
);

/**
 * Ficha del informe (única página del informe): la consultan todos y se imprime con estilo
 * limpio (clases no-print / ficha-print en index.css). Quien lo registró y el administrador
 * ven además Editar, Eliminar, público/privado, marcar como no vigente, versiones y bitácora.
 */
const FichaInforme = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [inf, setInf] = useState(null);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null); // 'anular' | 'eliminar'
  const [motivo, setMotivo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const { toast, avisar } = useToast();

  const cargar = useCallback(async () => {
    try {
      setInf(await informesService.obtener(id));
      setError(null);
    } catch (e) { setError(e.message); }
  }, [id]);

  useEffect(() => { setInf(null); cargar(); }, [cargar]);

  // Aviso que deja el formulario al guardar; se limpia para que no reaparezca al recargar
  const aviso = location.state?.aviso;
  const avisoEsError = Boolean(location.state?.error);
  useEffect(() => {
    if (!aviso) return;
    avisar(aviso, avisoEsError);
    navigate(location.pathname, { replace: true, state: null });
  }, [aviso, avisoEsError, avisar, navigate, location.pathname]);

  const abrir = async (archivo, inline) => {
    try { await informesService.abrirArchivo(id, archivo, inline); } catch (e) { avisar(e.message, true); }
  };

  const accion = async (fn, ok) => {
    setOcupado(true);
    try {
      await fn();
      setModal(null);
      setMotivo('');
      if (ok) { avisar(ok); cargar(); }
    } catch (err) { avisar(err.message, true); } finally { setOcupado(false); }
  };

  const anular = () => accion(() => informesService.anular(id, motivo), 'El informe ya no está vigente');
  const eliminar = () => accion(async () => {
    await informesService.eliminar(id);
    navigate(rutas.lista, { replace: true });
  });
  const cambiarVisibilidad = () => accion(
    () => informesService.publicar(id, !inf.PUBLICADO),
    inf.PUBLICADO ? 'Ahora es privado: solo tú y el administrador lo ven' : 'Ahora es público: lo ven todos los usuarios',
  );

  if (error) return <div className="p-4 sm:p-6"><ErrorAlert>{error}</ErrorAlert><Link to={rutas.lista} className="text-sm text-moq-azul">← Volver</Link></div>;
  if (!inf) return <div className="flex justify-center py-16"><Spinner /></div>;

  const gestiona = Boolean(inf.permisos?.editar);
  const vigente = inf.ESTADO !== 'ANULADO';
  const est = estado(inf.ESTADO);

  return (
    <div className="p-4 sm:p-6 max-w-5xl ficha-print">
      <div className="no-print flex flex-wrap items-center justify-between gap-2 mb-3">
        <Link to={rutas.lista} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-moq-azul">
          <ArrowLeft size={14} /> Informes
        </Link>
        <div className="flex flex-wrap gap-2">
          {gestiona && vigente && (
            <Button size="sm" onClick={() => navigate(rutas.editar(id))}><Pencil size={15} /> Editar</Button>
          )}
          {gestiona && (
            <Button variant="danger" size="sm" onClick={() => setModal('eliminar')}><Trash2 size={15} /> Eliminar</Button>
          )}
          {gestiona && vigente && (
            <>
              <Button variant="secondary" size="sm" onClick={cambiarVisibilidad} disabled={ocupado}>
                {inf.PUBLICADO ? <><Lock size={15} /> Hacer privado</> : <><Globe size={15} /> Hacer público</>}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setModal('anular')}><Ban size={15} /> Marcar como no vigente</Button>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={() => window.print()}><Printer size={15} /> Imprimir</Button>
        </div>
      </div>

      <header className="mb-4">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">Ficha resumen · {APP_CONFIG.name}</p>
        <h1 className="text-lg font-bold font-mono text-slate-900">{inf.CODIGO}</h1>
        <div className="mt-1">
          <Badge color={est.color}>{est.label}</Badge>
          {gestiona && (inf.PUBLICADO ? <Badge color="#16a34a">Público</Badge> : <Badge color="#64748b">Privado</Badge>)}
        </div>
        {gestiona && <p className="no-print text-[11px] text-slate-400 mt-1">Registrado por {inf.REGISTRADO_POR}</p>}
      </header>

      {!vigente && <ErrorAlert>No vigente: {inf.MOTIVO_ANULACION}</ErrorAlert>}

      <FichaContenido inf={inf} onAbrir={abrir} />

      <p className="text-[11px] text-slate-400 mt-4">
        Emitido por la Oficina Regional de Asesoría Jurídica{inf.FECHA_PUBLICACION ? ` · publicado el ${formatFechaHora(inf.FECHA_PUBLICACION)}` : ''}.
        Para efectos oficiales, prevalece el PDF firmado.
      </p>
      <p className="text-[11px] text-slate-400 mt-1">
        Criterio referencial de la ORAJ, no vinculante (art. 182 del TUO de la Ley N° 27444). Si un ente rector
        (SERVIR, OECE, MEF u otro) se pronunció sobre lo mismo, prevalece su opinión.
      </p>

      {/* Solo para quien lo gestiona; no se imprime */}
      {gestiona && (
        <div className="no-print mt-6 space-y-4">
          {(inf.solicitud.length > 1 || inf.archivos.length > 1) && (
            <Card className="p-5 space-y-4">
              <h2 className="font-semibold text-slate-800">Versiones anteriores</h2>
              {inf.solicitud.length > 1 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5"><MessageSquareText size={13} /> Documento de origen</h3>
                  <Versiones archivos={inf.solicitud} onAbrir={abrir} />
                </div>
              )}
              {inf.archivos.length > 1 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 flex items-center gap-1.5"><FileText size={13} /> Informe firmado</h3>
                  <Versiones archivos={inf.archivos} onAbrir={abrir} />
                </div>
              )}
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-3"><History size={17} /> Bitácora</h2>
            <ul className="space-y-2">
              {inf.bitacora.map((b) => (
                <li key={b.ID_AUDITORIA} className="text-sm">
                  <span className="text-slate-400 text-xs mr-2">{formatFechaHora(b.FECHA)}</span>
                  <span className="font-medium text-slate-700">{b.USUARIO}</span>{' '}
                  <span className="text-slate-600">{ACCIONES[b.ACCION] || b.ACCION}</span>
                  {b.DETALLE && <span className="block text-xs text-slate-400 break-all">{b.DETALLE}</span>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <Modal open={modal === 'anular'} onClose={() => setModal(null)} title="Marcar como no vigente">
        <p className="text-sm text-slate-600 mb-3">
          No se elimina: queda registrado con su motivo y sus archivos, y deja de verse para los demás usuarios.
        </p>
        <Field label="Motivo" required>
          <Textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} />
        </Field>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
          <Button variant="danger" onClick={anular} disabled={!motivo.trim() || ocupado}>Marcar como no vigente</Button>
        </div>
      </Modal>

      <Modal open={modal === 'eliminar'} onClose={() => setModal(null)} title={`Eliminar ${inf.CODIGO}`}>
        <p className="text-sm text-slate-600">
          Se borran el informe, sus PDF, su normativa y su bitácora. <strong>No se puede deshacer.</strong>
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
          <Button variant="danger" onClick={eliminar} disabled={ocupado}>Eliminar</Button>
        </div>
      </Modal>

      <Toast toast={toast} />
    </div>
  );
};

export default FichaInforme;
