-- ============================================
-- 013: sin anexos sueltos — el documento de origen se sube con todos sus anexos en un
-- solo PDF (mismo cambio que tables/09). Se borran los archivos de categoría ANTECEDENTE
-- y la columna DESCRIPCION (solo la usaban ellos).
-- ============================================
DELETE FROM "INFORME_ARCHIVOS" WHERE "CATEGORIA" = 'ANTECEDENTE';

ALTER TABLE "INFORME_ARCHIVOS" DROP CONSTRAINT IF EXISTS "CHK_INFORME_ARCHIVOS_CATEGORIA";
ALTER TABLE "INFORME_ARCHIVOS" ADD CONSTRAINT "CHK_INFORME_ARCHIVOS_CATEGORIA"
    CHECK ("CATEGORIA" IN ('OFICIAL', 'SOLICITUD'));

ALTER TABLE "INFORME_ARCHIVOS" DROP COLUMN IF EXISTS "DESCRIPCION";
