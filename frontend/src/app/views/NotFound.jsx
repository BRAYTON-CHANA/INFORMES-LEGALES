import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { EmptyState } from '@/shared/components/ui';

const NotFound = () => (
  <EmptyState icon={SearchX} title="Página no encontrada" subtitle="La dirección no existe o fue movida.">
    <Link to="/" className="mt-4 text-sm font-medium text-moq-azul hover:underline">Ir a los informes</Link>
  </EmptyState>
);

export default NotFound;
