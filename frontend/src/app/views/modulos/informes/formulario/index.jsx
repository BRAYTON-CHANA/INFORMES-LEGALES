import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, FilePlus2, Pencil } from 'lucide-react';
import { Button, ErrorAlert, Spinner } from '@/shared/components/ui';
import { informesService } from '@/features/informes/services/informesService';
import InformeForm from '@/features/informes/components/InformeForm';
import { rutas } from '@/features/informes/utils/rutas';

/** Registrar (/nuevo) o editar (/:id/editar) un informe: página completa dentro del layout */
const FormularioInforme = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [catalogos, setCatalogos] = useState(null);
  const [inf, setInf] = useState(id ? null : undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    informesService.catalogos().then(setCatalogos).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!id) { setInf(undefined); return; }
    setInf(null);
    informesService.obtener(id).then(setInf).catch((e) => setError(e.message));
  }, [id]);

  const volver = id ? rutas.ficha(id) : rutas.lista;

  if (error) return <div className="p-4 sm:p-6"><ErrorAlert>{error}</ErrorAlert><Link to={volver} className="text-sm text-moq-azul">← Volver</Link></div>;
  if (!catalogos || inf === null) return <div className="flex justify-center py-16"><Spinner /></div>;

  // Registrar: admin/abogado. Editar: quien lo registró o el administrador, si está vigente
  if (!id && !catalogos.puedeRegistrar) return <Navigate to={rutas.lista} replace />;
  if (id && (!inf.permisos?.editar || inf.ESTADO === 'ANULADO')) return <Navigate to={rutas.ficha(id)} replace />;

  const guardado = (row, nuevo, { error: avisoError, publico } = {}) => navigate(rutas.ficha(nuevo ? row.ID_INFORME : id), {
    state: {
      aviso: avisoError
        || `${nuevo ? 'Informe registrado' : 'Cambios guardados'}${publico ? ': es público' : ''}`,
      error: Boolean(avisoError),
    },
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Link to={volver}>
          <Button variant="secondary"><ArrowLeft size={16} /> {id ? 'Volver al informe' : 'Volver a informes'}</Button>
        </Link>
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          {id ? <Pencil size={20} /> : <FilePlus2 size={20} />} {id ? `Editar ${inf.CODIGO}` : 'Registrar informe'}
        </h1>
      </div>
      <InformeForm informe={inf ?? null} catalogos={catalogos} onGuardado={guardado} onCancelar={() => navigate(volver)} />
    </div>
  );
};

export default FormularioInforme;
