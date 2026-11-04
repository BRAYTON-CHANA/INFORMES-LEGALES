import { BookOpen } from 'lucide-react';
import { Field, Input } from '@/shared/components/ui';
import CatalogoPagina from '@/features/catalogos/components/CatalogoPagina';

const columnas = [{ label: 'Nombre', render: (f) => f.NOMBRE }];

const Formulario = ({ datos, set }) => (
  <Field label="Nombre" required>
    <Input value={datos.NOMBRE ?? ''} onChange={(e) => set('NOMBRE', e.target.value)} placeholder="Contrataciones del Estado" autoFocus />
  </Field>
);

/** Configuración › Informes › Materias */
const Materias = () => (
  <CatalogoPagina
    clave="materias" pk="ID_MATERIA" titulo="Materias" singular="Materia" icono={BookOpen}
    descripcion="Materias con que se clasifican los informes; las ejecutoras filtran por ellas."
    columnas={columnas} vacio={() => ({ NOMBRE: '' })} Formulario={Formulario}
  />
);

export default Materias;
