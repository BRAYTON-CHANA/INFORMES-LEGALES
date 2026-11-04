import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

/**
 * Lista desplegable de normas con búsqueda: filtra el catálogo mientras se escribe y,
 * si la norma no está, ofrece agregar lo escrito tal cual (no se guarda en el catálogo).
 * opciones: textos sugeridos. onAgregar(texto).
 */
const NormaSelector = ({ opciones, onAgregar, clave, placeholder }) => {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const caja = useRef(null);
  const input = useRef(null);
  const idLista = useId();

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => { if (!caja.current?.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  const t = texto.trim();
  const filtradas = opciones.filter((o) => clave(o).includes(clave(t)));
  const exacta = filtradas.some((o) => clave(o) === clave(t));
  // Items: las normas que coinciden y, al final, "Agregar lo escrito" si no está en la lista
  const items = [...filtradas.map((o) => ({ texto: o })), ...(t && !exacta ? [{ texto: t, manual: true }] : [])];

  const elegir = (item) => {
    onAgregar(item.texto);
    setTexto('');
    setActivo(0);
    setAbierto(false);
    input.current?.focus();
  };

  const teclas = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setActivo((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (abierto && items[activo]) elegir(items[activo]);
      else if (t) elegir({ texto: t });
    } else if (e.key === 'Escape') setAbierto(false);
  };

  return (
    <div ref={caja} className="relative">
      <div className="relative">
        <input
          ref={input} type="text" role="combobox" aria-expanded={abierto} aria-controls={idLista} aria-autocomplete="list"
          aria-label="Agregar norma" maxLength={500} placeholder={placeholder}
          aria-activedescendant={abierto && items[activo] ? `${idLista}-${activo}` : undefined}
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setActivo(0); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          onKeyDown={teclas}
          className="w-full h-[38px] pl-3 pr-9 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gore-500 focus:border-gore-500"
        />
        <button type="button" tabIndex={-1} aria-label="Ver normas" onClick={() => { setAbierto(!abierto); input.current?.focus(); }}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-600">
          <ChevronDown size={16} className={`transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {abierto && (
        <ul id={idLista} role="listbox"
          className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1">
          {items.map((item, i) => (
            <li
              key={`${item.manual ? 'm' : 'c'}-${item.texto}`} id={`${idLista}-${i}`} role="option" aria-selected={i === activo}
              onMouseDown={(e) => { e.preventDefault(); elegir(item); }}
              onMouseEnter={() => setActivo(i)}
              className={`px-3 py-2 text-sm cursor-pointer ${i === activo ? 'bg-gore-50 text-gore-800' : 'text-slate-700'} ${
                item.manual ? 'border-t border-slate-100 flex items-center gap-1.5' : ''}`}
            >
              {item.manual
                ? <><Plus size={14} className="shrink-0" /> <span>Agregar «<strong className="font-medium">{item.texto}</strong>» (escrita a mano)</span></>
                : item.texto}
            </li>
          ))}
          {!items.length && (
            <li className="px-3 py-2 text-sm text-slate-400">
              {opciones.length ? 'Ya agregaste todas las normas del catálogo' : 'No hay normas en el catálogo: escribe la norma'}
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default NormaSelector;
