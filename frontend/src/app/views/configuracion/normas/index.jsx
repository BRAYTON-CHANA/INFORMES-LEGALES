import { Scale } from 'lucide-react';
import { Field, Input, Select } from '@/shared/components/ui';
import CatalogoPagina from '@/features/catalogos/components/CatalogoPagina';

// Misma lista que TIPOS_NORMA en lib/handlers/catalogos.js
const TIPOS = ['Constitución', 'Ley', 'Decreto Legislativo', 'Decreto Supremo', 'Ordenanza Regional', 'Resolución', 'Directiva', 'Otro'];

const columnas = [
  { label: 'Denominación', render: (f) => f.DENOMINACION },
  { label: 'Tipo', render: (f) => f.TIPO },
  { label: 'N°', render: (f) => f.NUMERO, className: 'font-mono text-xs' },
];

const Formulario = ({ datos, set }) => (
  <>
    <Field label="Denominación" required help="Así aparece en la normativa asociada de la ficha">
      <Input value={datos.DENOMINACION ?? ''} onChange={(e) => set('DENOMINACION', e.target.value)}
        placeholder="Ley N° 32069, Ley General de Contrataciones Públicas" autoFocus />
    </Field>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Tipo">
        <Select value={datos.TIPO ?? ''} onChange={(e) => set('TIPO', e.target.value)}>
          <option value="">—</option>
          {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="Número"><Input value={datos.NUMERO ?? ''} onChange={(e) => set('NUMERO', e.target.value)} placeholder="32069" /></Field>
    </div>
  </>
);

/** Configuración › Informes › Normas */
const Normas = () => (
  <CatalogoPagina
    clave="normas" pk="ID_NORMA" titulo="Normas" singular="Norma" icono={Scale}
    descripcion="Catálogo de normas para la normativa asociada de cada informe (y su búsqueda por norma)."
    columnas={columnas} vacio={() => ({ DENOMINACION: '', TIPO: '', NUMERO: '' })} Formulario={Formulario}
  />
);

export default Normas;
