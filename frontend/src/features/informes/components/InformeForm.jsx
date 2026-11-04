import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Card, Field, Input, Select, Textarea, ErrorAlert, IconButton } from '@/shared/components/ui';
import { informesService } from '../services/informesService';
import ArchivoPdf from './ArchivoPdf';
import NormaSelector from './NormaSelector';
import { vistaCodigo, hoyISO } from '../utils/constantes';

const VACIO = {
  ID_TIPO_DOCUMENTO: '', NUMERO: '', ANIO: new Date().getFullYear(), FECHA_EMISION: '', ASUNTO: '',
  RESUMEN: '', EXPEDIENTE: '', REFERENCIA: '', ID_AREA: '', ID_MATERIA: '',
  ID_TIPO_SOLICITUD: '', NUMERO_SOLICITUD: '', FECHA_SOLICITUD: '', ID_UE_SOLICITANTE: '', EMITIDO_DE_OFICIO: false,
  NOMBRE_ADMINISTRADO: '',
  CONTROVERSIA: '', ANTECEDENTES: '', CRITERIO: '', CONCLUSION: '', PALABRAS_CLAVE: '',
};

/** Por defecto, el primero de cada lista: el más común según Configuración → Tipos de documento */
const primero = (tipos) => tipos?.[0]?.ID_TIPO_DOCUMENTO ?? '';

const Seccion = ({ titulo, help, children }) => (
  <Card className="p-5 space-y-4">
    <div>
      <h2 className="font-semibold text-slate-800">{titulo}</h2>
      {help && <p className="text-xs text-slate-400">{help}</p>}
    </div>
    {children}
  </Card>
);

/** Subgrupo dentro de una sección, separado por una línea */
const Grupo = ({ titulo, help, children }) => (
  <div className="space-y-3 pt-4 border-t border-slate-100">
    <div>
      <h3 className="text-sm font-semibold text-slate-800">{titulo}</h3>
      {help && <p className="text-xs text-slate-400">{help}</p>}
    </div>
    {children}
  </div>
);

/**
 * Elección entre pocas opciones, todas a la vista (radios con forma de botón).
 * opciones: [[valor, etiqueta, detalle?]]. `compacto` = en una línea, sin detalle.
 */
const Opciones = ({ legend, name, valor, onChange, opciones, requerido, compacto }) => (
  <fieldset>
    <legend className="text-sm font-medium text-slate-700 mb-1.5">
      {legend}{requerido && <span className="text-gore-600"> *</span>}
    </legend>
    <div className={compacto ? 'inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50' : 'grid grid-cols-1 sm:grid-cols-2 gap-2'}>
      {opciones.map(([v, etiqueta, detalle]) => {
        const activo = valor === v;
        return (
          <label key={v} className={`cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gore-500 ${
            compacto
              ? `px-3 h-[34px] flex items-center rounded-md text-sm whitespace-nowrap ${activo ? 'bg-white shadow-sm text-gore-800 font-medium' : 'text-slate-600 hover:text-slate-800'}`
              : `flex items-start gap-2.5 rounded-xl border px-4 py-3 ${activo ? 'border-gore-300 bg-gore-50' : 'border-slate-200 hover:bg-slate-50'}`
          }`}>
            <input type="radio" name={name} value={v} checked={activo} onChange={() => onChange(v)}
              className={compacto ? 'sr-only' : 'mt-0.5 w-4 h-4 accent-gore-600'} />
            {compacto ? etiqueta : (
              <span>
                <span className={`block text-sm ${activo ? 'font-medium text-gore-800' : 'text-slate-700'}`}>{etiqueta}</span>
                {detalle && <span className="block text-xs text-slate-500">{detalle}</span>}
              </span>
            )}
          </label>
        );
      })}
    </div>
  </fieldset>
);

/**
 * Alta / edición de un informe con su sistematización (va en la página
 * app/views/modulos/informes/formulario). `informe` = null para crear.
 */
const InformeForm = ({ informe, catalogos, onGuardado, onCancelar }) => {
  const [form, setForm] = useState(VACIO);
  const [normas, setNormas] = useState([]); // [{ NORMA, ARTICULOS }]
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  // PDF del documento de origen elegido en el formulario; se sube después de guardar los datos
  const [pdfOrigen, setPdfOrigen] = useState(null);
  const [pdfOficial, setPdfOficial] = useState(null);
  // Público = lo ven todos los usuarios; privado = solo quien lo registró y el administrador
  const [publico, setPublico] = useState(false);
  const nuevo = !informe;
  const principal = (lista) => lista?.find((a) => a.ES_PRINCIPAL) || lista?.[0] || null;
  const origenActual = principal(informe?.solicitud);
  const oficialActual = principal(informe?.archivos);

  // La numeración es por año de emisión: el año sale de la fecha (no se pide aparte)
  const cambiarFechaEmision = (e) => {
    const fecha = e.target.value;
    setForm((f) => ({ ...f, FECHA_EMISION: fecha, ...(fecha ? { ANIO: Number(fecha.slice(0, 4)) } : {}) }));
  };

  // Al cambiar de UE se limpia el área: solo valen las de esa UE
  const cambiarUe = (e) => {
    const ue = e.target.value;
    setForm((f) => ({ ...f, ID_UE_SOLICITANTE: ue, ID_AREA: '' }));
  };
  const areasUe = (catalogos?.areas || []).filter((a) => String(a.ID_UNIDAD_EJECUTORA) === String(form.ID_UE_SOLICITANTE));

  useEffect(() => {
    setError(null);
    setPdfOrigen(null);
    setPdfOficial(null);
    setPublico(Boolean(informe?.PUBLICADO));
    if (informe) {
      const base = {};
      for (const k of Object.keys(VACIO)) base[k] = informe[k] ?? '';
      base.EMITIDO_DE_OFICIO = Boolean(informe.EMITIDO_DE_OFICIO);
      // Informes anteriores sin documento de origen: se propone el tipo más común para completarlo
      if (!base.ID_TIPO_SOLICITUD) base.ID_TIPO_SOLICITUD = primero(catalogos?.tiposSolicitud);
      setForm(base);
      setNormas((informe.normas || []).map((n) => ({ NORMA: n.NORMA, ARTICULOS: n.ARTICULOS || '' })));
    } else {
      setForm({
        ...VACIO,
        ID_TIPO_SOLICITUD: primero(catalogos?.tiposSolicitud),
        ID_TIPO_DOCUMENTO: primero(catalogos?.tiposRespuesta),
        FECHA_EMISION: hoyISO(),
      });
      setNormas([]);
    }
  }, [informe, catalogos]);

  // Número correlativo sugerido al elegir tipo / año (solo al crear)
  useEffect(() => {
    if (!nuevo || !form.ID_TIPO_DOCUMENTO || !form.ANIO) return undefined;
    let vigente = true;
    informesService.siguienteNumero(form.ID_TIPO_DOCUMENTO, form.ANIO)
      .then(({ numero }) => vigente && setForm((f) => ({ ...f, NUMERO: numero })))
      .catch(() => {});
    return () => { vigente = false; };
  }, [nuevo, form.ID_TIPO_DOCUMENTO, form.ANIO]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const tipo = catalogos?.tipos?.find((t) => t.ID_TIPO_DOCUMENTO === Number(form.ID_TIPO_DOCUMENTO));

  // Normativa: se guarda el texto. El catálogo solo sugiere; lo que no está se escribe a mano
  // y no se agrega al catálogo
  const clave = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const conNorma = (lista, texto) => {
    const t = texto.trim().replace(/\s+/g, ' ');
    return !t || lista.some((n) => clave(n.NORMA) === clave(t)) ? lista : [...lista, { NORMA: t, ARTICULOS: '' }];
  };
  // Límite del servidor (MAX_ARCHIVO_MB) para validar el PDF antes de subirlo
  const maxMb = catalogos?.maxArchivoMb || 10;
  const agregarNorma = (texto) => setNormas((lista) => conNorma(lista, texto));
  const setNorma = (i, k, v) => setNormas(normas.map((n, j) => (j === i ? { ...n, [k]: v } : n)));

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const body = {
        ...form,
        NORMAS: normas,
      };
      const guardado = nuevo
        ? await informesService.crear(body)
        : await informesService.actualizar(informe.ID_INFORME, body);
      const id = guardado.ID_INFORME;
      // Los datos ya quedaron guardados: si un archivo falla, se avisa y se puede volver a intentar editando
      const subidas = [
        !form.EMITIDO_DE_OFICIO && pdfOrigen && { file: pdfOrigen, categoria: 'SOLICITUD', nombre: 'el documento de origen' },
        pdfOficial && { file: pdfOficial, categoria: 'OFICIAL', nombre: 'el informe firmado' },
      ].filter(Boolean);
      const fallidos = [];
      for (const s of subidas) {
        try {
          await informesService.subirArchivo(id, s.file, s.categoria);
        } catch (err) {
          fallidos.push(`subir ${s.nombre} (${err.message})`);
        }
      }

      // Público / privado al final: para ser público necesita el PDF firmado, que recién se subió
      let avisoVisibilidad = null;
      if (publico !== Boolean(informe?.PUBLICADO)) {
        try {
          await informesService.publicar(id, publico);
        } catch (err) {
          avisoVisibilidad = `Se guardó como privado. ${err.message}`;
        }
      }

      const avisos = [
        fallidos.length && `Se guardó el informe, pero falló: ${fallidos.join('; ')}`,
        avisoVisibilidad,
      ].filter(Boolean);
      onGuardado(guardado, nuevo, { error: avisos.length ? avisos.join(' · ') : null, publico: publico && !avisoVisibilidad });
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar}>
      <ErrorAlert>{error}</ErrorAlert>

      {/* Orden de la cabecera y el cuerpo del informe: origen → informe emitido → contenido */}
      <div className="space-y-4 mb-4">
      <Seccion titulo="1. Documento de origen" help="El documento que pidió la opinión de la ORAJ">
        <Opciones
          legend="¿Cómo se originó este informe?"
          name="origen"
          valor={form.EMITIDO_DE_OFICIO ? 'OFICIO' : 'PEDIDO'}
          onChange={(v) => setForm((f) => ({ ...f, EMITIDO_DE_OFICIO: v === 'OFICIO' }))}
          opciones={[
            ['PEDIDO', 'A pedido', 'Una unidad ejecutora (o una de sus oficinas) lo solicitó'],
            ['OFICIO', 'Por iniciativa de la ORAJ', 'No hay documento de origen'],
          ]}
        />

        {!form.EMITIDO_DE_OFICIO && (
          <div className="space-y-5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(10rem,14rem)_1fr_11rem] gap-3">
              <Field label="Documento" required>
                <Select value={form.ID_TIPO_SOLICITUD} onChange={set('ID_TIPO_SOLICITUD')} required>
                  {catalogos?.tiposSolicitud?.map((t) => <option key={t.ID_TIPO_DOCUMENTO} value={t.ID_TIPO_DOCUMENTO}>{t.NOMBRE}</option>)}
                </Select>
              </Field>
              <Field label="Número" required>
                <Input value={form.NUMERO_SOLICITUD} onChange={set('NUMERO_SOLICITUD')} maxLength={150} placeholder="N° 120-2026-GRM/UE-ILO" required />
              </Field>
              <Field label="Fecha">
                <Input type="date" value={form.FECHA_SOLICITUD} onChange={set('FECHA_SOLICITUD')} max={form.FECHA_EMISION || undefined} />
              </Field>
            </div>

            {/* Procedencia: primero la unidad ejecutora (obligatoria) y luego, si se sabe, su oficina */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Field label="Unidad ejecutora" required>
                <Select value={form.ID_UE_SOLICITANTE} onChange={cambiarUe} required>
                  <option value="">Elige la unidad ejecutora…</option>
                  {catalogos?.unidades?.map((u) => <option key={u.ID_UNIDAD_EJECUTORA} value={u.ID_UNIDAD_EJECUTORA}>{u.CODIGO ? `${u.CODIGO} · ` : ''}{u.NOMBRE}</option>)}
                </Select>
              </Field>
              <Field label="Oficina o área" help={form.ID_UE_SOLICITANTE ? 'Opcional: la que firma el documento' : 'Primero elige la unidad ejecutora'}>
                <Select value={form.ID_AREA} onChange={set('ID_AREA')} disabled={!form.ID_UE_SOLICITANTE}>
                  <option value="">{areasUe.length || !form.ID_UE_SOLICITANTE ? '— Sin especificar —' : 'Esta UE no tiene áreas registradas'}</option>
                  {areasUe.map((a) => <option key={a.ID_AREA} value={a.ID_AREA}>{a.NOMBRE}{a.SIGLA ? ` (${a.SIGLA})` : ''}</option>)}
                </Select>
              </Field>
            </div>

            <ArchivoPdf
              label="PDF del documento" ayuda={`Todo en un solo PDF: el documento y sus anexos (hasta ${maxMb} MB)`}
              archivo={pdfOrigen} actual={origenActual} onChange={setPdfOrigen} maxMb={maxMb}
            />

            <div className="grid grid-cols-1 sm:grid-cols-[14rem_1fr] gap-3">
              <Field label="N° de expediente (SGD)">
                <Input value={form.EXPEDIENTE} onChange={set('EXPEDIENTE')} maxLength={100} placeholder="Ej. 4521-2026" />
              </Field>
              <Field label="Otras referencias">
                <Input value={form.REFERENCIA} onChange={set('REFERENCIA')} maxLength={500} placeholder="Ej. Informe Técnico N° 30-2026-GRM/GRI" />
              </Field>
            </div>
          </div>
        )}

        {/* También en informes de oficio: la persona o empresa cuyo caso se atiende */}
        <Field label="Nombre del administrado" help="La persona o empresa cuyo caso se atiende (opcional)">
          <Input value={form.NOMBRE_ADMINISTRADO} onChange={set('NOMBRE_ADMINISTRADO')} maxLength={300} placeholder="Ej. Juan Pérez Quispe" />
        </Field>
      </Seccion>

      <Seccion titulo="2. Informe emitido" help="El documento de la ORAJ con la opinión legal">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(10rem,14rem)_8rem_11rem] gap-3">
          <Field label="Documento" required>
            <Select value={form.ID_TIPO_DOCUMENTO} onChange={set('ID_TIPO_DOCUMENTO')} required>
              {catalogos?.tiposRespuesta?.map((t) => <option key={t.ID_TIPO_DOCUMENTO} value={t.ID_TIPO_DOCUMENTO}>{t.NOMBRE}</option>)}
            </Select>
          </Field>
          <Field label="Número" required>
            <Input type="number" min={1} value={form.NUMERO} onChange={set('NUMERO')} required />
          </Field>
          <Field label="Fecha de emisión" required>
            <Input type="date" value={form.FECHA_EMISION} onChange={cambiarFechaEmision} required />
          </Field>
        </div>

        {/* El código sale del tipo, el número y el año de la fecha de emisión */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
          <span className="text-xs text-slate-500">{nuevo ? 'Se registrará como' : 'Código'}</span>
          <span className="text-sm font-mono font-semibold text-slate-800">
            {vistaCodigo(tipo?.PREFIJO, form.NUMERO, form.ANIO, catalogos?.sigla)}
          </span>
          {nuevo && <span className="text-xs text-slate-400">· el número es el siguiente disponible</span>}
        </div>

        <Field label="Asunto" required>
          <Textarea rows={2} maxLength={500} value={form.ASUNTO} onChange={set('ASUNTO')} required
            placeholder="Ej. Ampliación de plazo del Contrato N° 15-2026-GRM" />
        </Field>

        <div className="sm:max-w-md">
          <Field label="Materia">
            <Select value={form.ID_MATERIA} onChange={set('ID_MATERIA')}>
              <option value="">Elige la materia…</option>
              {catalogos?.materias?.map((m) => <option key={m.ID_MATERIA} value={m.ID_MATERIA}>{m.NOMBRE}</option>)}
            </Select>
          </Field>
        </div>

        <ArchivoPdf
          label="PDF del informe firmado" ayuda={`El documento oficial que verán los usuarios (hasta ${maxMb} MB)`}
          archivo={pdfOficial} actual={oficialActual} onChange={setPdfOficial} maxMb={maxMb}
        />
      </Seccion>

      <Seccion titulo="3. Contenido del informe" help="Lo que verán los usuarios en la ficha resumen">
        <Field label="Resumen" help="De qué trata el caso y por qué se resolvió así">
          <Textarea rows={4} maxLength={3000} value={form.RESUMEN} onChange={set('RESUMEN')} />
        </Field>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Field label="Controversia / consulta" help="La pregunta jurídica planteada">
            <Textarea rows={4} value={form.CONTROVERSIA} onChange={set('CONTROVERSIA')} />
          </Field>
          <Field label="Antecedentes" help="Los hechos relevantes del caso">
            <Textarea rows={4} value={form.ANTECEDENTES} onChange={set('ANTECEDENTES')} />
          </Field>
        </div>

        <Grupo titulo="Normativa asociada" help="Las normas en que se sustenta, con los artículos aplicados">
        {normas.length > 0 && (
          <ul className="space-y-2">
            {normas.map((n, i) => (
              <li key={clave(n.NORMA)} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <span className="text-sm text-slate-700 flex-1 min-w-[12rem]">{n.NORMA}</span>
                <Input className="sm:w-48" placeholder="Arts. 6, 10…" value={n.ARTICULOS} onChange={(e) => setNorma(i, 'ARTICULOS', e.target.value)} maxLength={300} />
                <IconButton type="button" title="Quitar" className="hover:text-red-600" onClick={() => setNormas(normas.filter((_, j) => j !== i))}><Trash2 size={14} /></IconButton>
              </li>
            ))}
          </ul>
        )}
        {/* Al elegir una de la lista (o "Agregar … escrita a mano") se suma a la lista de arriba */}
        <NormaSelector
          clave={clave}
          onAgregar={agregarNorma}
          placeholder={normas.length ? 'Agregar otra norma: elige o escribe…' : 'Elige la norma o escríbela…'}
          opciones={(catalogos?.normas || []).map((n) => n.DENOMINACION)
            .filter((d) => !normas.some((x) => clave(x.NORMA) === clave(d)))}
        />
        <p className="text-[11px] text-slate-400">
          Elige de la lista o, si no está, escribe la norma completa (p. ej. «Ley N° 30225, Ley de Contrataciones del Estado»).
          Lo escrito a mano no se agrega al catálogo.
        </p>
        </Grupo>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Field label="Criterio de la ORAJ" help="La regla que sirve para otros casos (en 2 o 3 líneas)">
            <Textarea rows={4} maxLength={2000} value={form.CRITERIO} onChange={set('CRITERIO')}
              placeholder="Ej. Procede la ampliación de plazo cuando el atraso no es imputable al contratista…" />
          </Field>
          <Field label="Conclusión" help="Lo que se resolvió en este caso">
            <Textarea rows={4} value={form.CONCLUSION} onChange={set('CONCLUSION')}
              placeholder="Ej. Procede otorgar al Contrato N° 15-2026 una ampliación de 30 días…" />
          </Field>
        </div>

        <Grupo titulo="Visibilidad">
          <Opciones
            legend="¿Quién puede ver este informe?" name="visibilidad"
            valor={publico ? 'PUBLICO' : 'PRIVADO'} onChange={(v) => setPublico(v === 'PUBLICO')}
            opciones={[
              ['PUBLICO', 'Público', 'Lo ven todos los usuarios del sistema'],
              ['PRIVADO', 'Privado', 'Solo tú y el administrador'],
            ]}
          />
          {publico && !informe?.PUBLICADO && (
            <p className="text-xs text-slate-500">
              Para ser público necesita el PDF firmado, la materia, el resumen y al menos una norma; si falta algo, se guarda como privado.
            </p>
          )}
          <Field label="Palabras clave" help="Opcional: sinónimos o temas que no aparecen en el texto">
            <Input value={form.PALABRAS_CLAVE} onChange={set('PALABRAS_CLAVE')} maxLength={500} placeholder="Separadas por comas" />
          </Field>
        </Grupo>
      </Seccion>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/95 backdrop-blur border-t border-slate-200 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancelar}>Cancelar</Button>
        <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : nuevo ? 'Registrar informe' : 'Guardar cambios'}</Button>
      </div>
    </form>
  );
};

export default InformeForm;
