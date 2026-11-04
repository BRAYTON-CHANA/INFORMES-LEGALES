import { Files } from 'lucide-react';
import { Field, Input } from '@/shared/components/ui';
import CatalogoPagina from '@/features/catalogos/components/CatalogoPagina';

// En la tabla solo nombre y prefijo; en qué lista aparece y su orden se ven al editar (admin)
const columnas = [
  { label: 'Nombre', render: (f) => f.NOMBRE },
  { label: 'Prefijo del código', render: (f) => f.PREFIJO, className: 'font-mono text-xs' },
];

const Casilla = ({ checked, onChange, children }) => (
  <label className="flex items-center gap-2 text-sm text-slate-700">
    <input type="checkbox" className="w-4 h-4" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
    {children}
  </label>
);

const Formulario = ({ datos, set }) => (
  <>
    <Field label="Nombre" required>
      <Input value={datos.NOMBRE ?? ''} onChange={(e) => set('NOMBRE', e.target.value)} placeholder="Informe legal" autoFocus />
    </Field>
    <Field label="Prefijo del código" required
      help={`Así: ${(datos.PREFIJO || 'INFORME LEGAL').toUpperCase()} N° 001-2026-GRM/GGR/ORAJ. Un cambio solo aplica a los informes nuevos.`}>
      <Input value={datos.PREFIJO ?? ''} onChange={(e) => set('PREFIJO', e.target.value)} placeholder="INFORME LEGAL" />
    </Field>

    <p className="text-xs text-slate-500">
      ¿En qué lista del registro aparece? El orden va de 1 (primero, el más común) en adelante.
    </p>
    <div className="grid grid-cols-[1fr_7rem] gap-3 items-end">
      <Casilla checked={datos.USO_SOLICITUD} onChange={(v) => set('USO_SOLICITUD', v)}>
        Documento de origen (oficio, memorando…)
      </Casilla>
      <Field label="Orden">
        <Input type="number" min={0} max={999} value={datos.ORDEN_SOLICITUD ?? ''} onChange={(e) => set('ORDEN_SOLICITUD', e.target.value)}
          disabled={!datos.USO_SOLICITUD} />
      </Field>
      <Casilla checked={datos.USO_RESPUESTA} onChange={(v) => set('USO_RESPUESTA', v)}>
        Informe emitido por la ORAJ (informe legal, opinión legal…)
      </Casilla>
      <Field label="Orden">
        <Input type="number" min={0} max={999} value={datos.ORDEN ?? ''} onChange={(e) => set('ORDEN', e.target.value)}
          disabled={!datos.USO_RESPUESTA} />
      </Field>
    </div>
  </>
);

/** Configuración › Informes › Tipos de documento */
const TiposDocumento = () => (
  <CatalogoPagina
    clave="tipos-documento" pk="ID_TIPO_DOCUMENTO" titulo="Tipos de documento" singular="Tipo de documento" icono={Files}
    descripcion="Documentos de origen (con que se pide la opinión) e informes que emite la ORAJ. El prefijo encabeza el código de cada informe."
    columnas={columnas}
    vacio={() => ({ NOMBRE: '', PREFIJO: '', USO_RESPUESTA: true, USO_SOLICITUD: false, ORDEN: 50, ORDEN_SOLICITUD: 50 })}
    Formulario={Formulario}
  />
);

export default TiposDocumento;
