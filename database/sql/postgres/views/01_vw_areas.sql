-- ============================================
-- VW_AREAS: cada oficina o área con su unidad ejecutora (lista de Configuración y del formulario)
-- ============================================
CREATE OR REPLACE VIEW "VW_AREAS" AS
SELECT a."ID_AREA", a."ID_UNIDAD_EJECUTORA", a."NOMBRE", a."SIGLA", a."ACTIVO",
       ue."CODIGO" AS "UE_CODIGO", ue."NOMBRE" AS "UE_NOMBRE", ue."SIGLA" AS "UE_SIGLA", ue."ACTIVO" AS "UE_ACTIVO"
FROM "AREAS" a
JOIN "UNIDADES_EJECUTORAS" ue ON ue."ID_UNIDAD_EJECUTORA" = a."ID_UNIDAD_EJECUTORA";
