/** Franja azul y verde (colores de Moquegua) bajo el rojo institucional */
const FranjaMoquegua = ({ className = 'h-1' }) => (
  <div className={`flex shrink-0 ${className}`} aria-hidden="true">
    <div className="flex-1 bg-moq-azul" />
    <div className="flex-1 bg-moq-verde" />
  </div>
);

export default FranjaMoquegua;
