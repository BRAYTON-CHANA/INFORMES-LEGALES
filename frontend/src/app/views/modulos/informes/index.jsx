import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, FileDown, Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import {
  Button, Badge, ErrorAlert, PageHeader, Table, Tr, Td, EmptyState, Spinner, Paginacion, IconButton, Modal,
} from '@/shared/components/ui';
import { Toast, useToast } from '@/shared/components/Toast';
import { formatFecha } from '@/shared/utils/format';
import { informesService } from '@/features/informes/services/informesService';
import FiltrosInformes, { FILTROS_VACIOS } from '@/features/informes/components/FiltrosInformes';
import { estado } from '@/features/informes/utils/constantes';
import { rutas } from '@/features/informes/utils/rutas';

const PAGE_SIZE = 20;

/** Texto que abre el PDF si se subió; si no, texto normal */
const EnlacePdf = ({ pdf, onAbrir, className = '', children }) => (pdf ? (
  <button type="button" onClick={onAbrir} title={`Abrir ${pdf.NOMBRE_ORIGINAL}`}
    className={`inline-flex items-start gap-1 text-left text-moq-azul hover:underline ${className}`}>
    <FileDown size={14} className="shrink-0 mt-px" aria-hidden="true" /> <span>{children}</span>
  </button>
) : <span className={`text-slate-700 ${className}`} title="Sin PDF">{children}</span>);

/** Repositorio: búsqueda y listado de informes legales */
const Informes = () => {
  const navigate = useNavigate();
  const [catalogos, setCatalogos] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [texto, setTexto] = useState('');
  const [page, setPage] = useState(1);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [eliminar, setEliminar] = useState(null); // informe a eliminar (fila)
  const [borrando, setBorrando] = useState(false);
  const { toast, avisar } = useToast();

  useEffect(() => {
    informesService.catalogos().then(setCatalogos).catch((e) => setError(e.message));
  }, []);

  const cargar = useCallback(async () => {
    try {
      setDatos(await informesService.listar({ ...filtros, page, pageSize: PAGE_SIZE }));
      setError(null);
    } catch (e) { setError(e.message); }
  }, [filtros, page]);

  useEffect(() => { cargar(); }, [cargar]);

  // Búsqueda libre con pequeña espera para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      setFiltros((f) => (f.q === texto ? f : { ...f, q: texto }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [texto]);

  const hayFiltros = texto || Object.entries(filtros).some(([k, v]) => k !== 'q' && v);

  const confirmarEliminar = async () => {
    setBorrando(true);
    try {
      await informesService.eliminar(eliminar.ID_INFORME);
      avisar(`${eliminar.CODIGO} eliminado`);
      setEliminar(null);
      cargar();
    } catch (err) { avisar(err.message, true); } finally { setBorrando(false); }
  };

  // Abre el PDF en otra pestaña (desde ahí se puede descargar)
  const abrir = async (id, pdf) => {
    try { await informesService.abrirArchivo(id, pdf, true); } catch (err) { avisar(err.message, true); }
  };

  // Quien registra (admin y abogados) ve también sus informes privados
  const registrar = (datos?.perfil ?? catalogos?.perfil)?.registrar ?? false;

  return (
    <div className="p-4 sm:p-6">
      <PageHeader icon={FileText} title="Informes legales de la ORAJ">
        {datos?.puedeRegistrar && (
          <Button onClick={() => navigate(rutas.nuevo)}><Plus size={16} /> Registrar</Button>
        )}
      </PageHeader>

      <ErrorAlert>{error}</ErrorAlert>

      <FiltrosInformes
        filtros={filtros}
        onCambio={(cambio) => { setFiltros((f) => ({ ...f, ...cambio })); setPage(1); }}
        texto={texto}
        onTexto={setTexto}
        catalogos={catalogos}
        registrar={registrar}
        total={datos?.total}
      />

      {!datos ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : !datos.items.length ? (
        <EmptyState icon={FileText} title="No hay informes" subtitle={hayFiltros ? 'Prueba con otros filtros' : 'Registra el primero'} />
      ) : (
        <>
          <Table columns={[
            { label: 'Informe legal' }, { label: 'Institución' }, { label: 'Asunto' }, { label: 'Fecha' },
            { label: 'Oficio' }, { label: 'Administrado' }, ...(registrar ? [{ label: 'Estado' }] : []), { label: 'Acciones' },
          ]}>
            {datos.items.map((r) => (
              <Tr key={r.ID_INFORME} inactivo={r.ESTADO === 'ANULADO'}>
                <Td className="min-w-[11rem]">
                  <EnlacePdf pdf={r.PDF_OFICIAL} onAbrir={() => abrir(r.ID_INFORME, r.PDF_OFICIAL)} className="font-mono text-xs">
                    {r.CODIGO}
                  </EnlacePdf>
                </Td>
                <Td className="text-xs">{r.EMITIDO_DE_OFICIO ? 'ORAJ (de oficio)' : r.PROCEDENCIA || '—'}</Td>
                <Td className="max-w-md">
                  <span className="line-clamp-2">{r.ASUNTO}</span>
                  {r.RESUMEN ? (
                    <span className="block text-xs text-slate-500 line-clamp-2 mt-0.5"><strong className="font-medium">Resumen:</strong> {r.RESUMEN}</span>
                  ) : r.CRITERIO && <span className="block text-xs text-slate-500 line-clamp-2 mt-0.5"><strong className="font-medium">Criterio:</strong> {r.CRITERIO}</span>}
                  {r.FRAGMENTO && (
                    <span className="block text-xs text-slate-500 italic line-clamp-2 mt-0.5 border-l-2 border-amber-300 pl-2" title="Texto del documento">
                      {r.FRAGMENTO}
                    </span>
                  )}
                  {r.EXPEDIENTE && <span className="block text-xs text-slate-400">Exp. {r.EXPEDIENTE}</span>}
                </Td>
                <Td className="whitespace-nowrap">{formatFecha(r.FECHA_EMISION)}</Td>
                <Td className="text-xs min-w-[9rem]">
                  {r.NUMERO_SOLICITUD ? (
                    <EnlacePdf pdf={r.PDF_ORIGEN} onAbrir={() => abrir(r.ID_INFORME, r.PDF_ORIGEN)}>
                      {[r.TIPO_SOLICITUD, r.NUMERO_SOLICITUD].filter(Boolean).join(' ')}
                    </EnlacePdf>
                  ) : '—'}
                </Td>
                <Td className="text-xs">{r.NOMBRE_ADMINISTRADO || '—'}</Td>
                {/* Estado: control interno, solo admin y abogados */}
                {registrar && (
                  <Td className="whitespace-nowrap">
                    <Badge color={estado(r.ESTADO).color}>{estado(r.ESTADO).label}</Badge>
                    {!r.PUBLICADO && <Badge color="#64748b">Privado</Badge>}
                  </Td>
                )}
                <Td className="whitespace-nowrap">
                  <div className="flex items-center gap-0.5">
                    <IconButton title="Ver ficha" onClick={() => navigate(rutas.ficha(r.ID_INFORME))}><Eye size={16} /></IconButton>
                    {/* Editar y Eliminar: solo quien lo registró y el administrador */}
                    {r.PUEDE_EDITAR && (
                      <>
                        {r.ESTADO !== 'ANULADO' && (
                          <IconButton title="Editar" onClick={() => navigate(rutas.editar(r.ID_INFORME))}><Pencil size={16} /></IconButton>
                        )}
                        <IconButton title="Eliminar" className="hover:text-red-600" onClick={() => setEliminar(r)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
          <Paginacion page={page} total={datos.total} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}

      <Modal open={Boolean(eliminar)} onClose={() => setEliminar(null)} title={`Eliminar ${eliminar?.CODIGO || 'el informe'}`}>
        <p className="text-sm text-slate-600">
          Se borran el informe, sus PDF, su normativa y su bitácora. <strong>No se puede deshacer.</strong>
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setEliminar(null)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmarEliminar} disabled={borrando}>Eliminar</Button>
        </div>
      </Modal>
      <Toast toast={toast} />
    </div>
  );
};

export default Informes;
