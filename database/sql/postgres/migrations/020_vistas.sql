-- ============================================
-- 020: vistas para las consultas con JOIN (mismo contenido que views/01-03).
-- El código las lee y escribe en las tablas.
-- ============================================

-- ============================================
-- VW_AREAS: cada oficina o área con su unidad ejecutora (lista de Configuración y del formulario)
-- ============================================
CREATE OR REPLACE VIEW "VW_AREAS" AS
SELECT a."ID_AREA", a."ID_UNIDAD_EJECUTORA", a."NOMBRE", a."SIGLA", a."ACTIVO",
       ue."CODIGO" AS "UE_CODIGO", ue."NOMBRE" AS "UE_NOMBRE", ue."SIGLA" AS "UE_SIGLA", ue."ACTIVO" AS "UE_ACTIVO"
FROM "AREAS" a
JOIN "UNIDADES_EJECUTORAS" ue ON ue."ID_UNIDAD_EJECUTORA" = a."ID_UNIDAD_EJECUTORA";

-- ============================================
-- VW_INFORMES: el informe con los nombres de sus catálogos y usuarios (lista, búsqueda y ficha).
-- Conserva las columnas de INFORMES (menos TEXTO_DOCUMENTO) para filtrar igual que sobre la tabla.
-- Solo lectura: las escrituras van a INFORMES.
-- ============================================
CREATE OR REPLACE VIEW "VW_INFORMES" AS
SELECT i."ID_INFORME", i."ID_TIPO_DOCUMENTO", i."NUMERO", i."ANIO", i."CODIGO", i."ASUNTO", i."RESUMEN",
       i."EXPEDIENTE", i."REFERENCIA", i."ID_TIPO_SOLICITUD", i."NUMERO_SOLICITUD", i."FECHA_SOLICITUD",
       i."EMITIDO_DE_OFICIO", i."NOMBRE_ADMINISTRADO", i."ID_UE_SOLICITANTE", i."ID_AREA", i."ID_MATERIA",
       i."FECHA_EMISION", i."CONTROVERSIA", i."ANTECEDENTES", i."CRITERIO", i."CONCLUSION", i."PALABRAS_CLAVE",
       i."ESTADO", i."MOTIVO_ANULACION", i."PUBLICADO", i."FECHA_PUBLICACION", i."ID_USUARIO_PUBLICA",
       i."TEXTO_EXTRAIDO", i."TEXTO_BUSQUEDA", i."ID_USUARIO_REGISTRO", i."FECHA_CREACION", i."FECHA_MODIFICACION",
       i."ACTIVO",
       td."NOMBRE" AS "TIPO_DOCUMENTO",
       ts."NOMBRE" AS "TIPO_SOLICITUD",
       m."NOMBRE" AS "MATERIA",
       ue."NOMBRE" AS "UE_SOLICITANTE",
       ue."SIGLA" AS "UE_SIGLA",
       a."NOMBRE" AS "AREA",
       -- "UGEL Ilo — Área de Gestión Administrativa"
       CASE WHEN a."NOMBRE" IS NULL THEN ue."NOMBRE" ELSE ue."NOMBRE" || ' — ' || a."NOMBRE" END AS "PROCEDENCIA",
       TRIM(ur."NOMBRES" || COALESCE(' ' || ur."APELLIDOS", '')) AS "REGISTRADO_POR",
       TRIM(up."NOMBRES" || COALESCE(' ' || up."APELLIDOS", '')) AS "PUBLICADO_POR"
FROM "INFORMES" i
LEFT JOIN "TIPOS_DOCUMENTO" td ON td."ID_TIPO_DOCUMENTO" = i."ID_TIPO_DOCUMENTO"
LEFT JOIN "TIPOS_DOCUMENTO" ts ON ts."ID_TIPO_DOCUMENTO" = i."ID_TIPO_SOLICITUD"
LEFT JOIN "MATERIAS" m ON m."ID_MATERIA" = i."ID_MATERIA"
LEFT JOIN "UNIDADES_EJECUTORAS" ue ON ue."ID_UNIDAD_EJECUTORA" = i."ID_UE_SOLICITANTE"
LEFT JOIN "AREAS" a ON a."ID_AREA" = i."ID_AREA"
LEFT JOIN "USUARIOS" ur ON ur."ID_USUARIO" = i."ID_USUARIO_REGISTRO"
LEFT JOIN "USUARIOS" up ON up."ID_USUARIO" = i."ID_USUARIO_PUBLICA";

-- ============================================
-- VW_USUARIOS: cuentas con su unidad ejecutora, SIN la clave (Configuración → Usuarios)
-- ============================================
CREATE OR REPLACE VIEW "VW_USUARIOS" AS
SELECT u."ID_USUARIO", u."DNI", u."NOMBRES", u."APELLIDOS", u."EMAIL", u."ID_UNIDAD_EJECUTORA",
       u."REQUIERE_CAMBIO_PASSWORD", u."INTENTOS_FALLIDOS", u."BLOQUEADO_HASTA", u."ACTIVO",
       u."FECHA_CREACION", u."FECHA_EDICION",
       ue."NOMBRE" AS "UE_NOMBRE", ue."SIGLA" AS "UE_SIGLA"
FROM "USUARIOS" u
LEFT JOIN "UNIDADES_EJECUTORAS" ue ON ue."ID_UNIDAD_EJECUTORA" = u."ID_UNIDAD_EJECUTORA";
