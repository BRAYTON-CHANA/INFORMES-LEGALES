-- ============================================
-- 013: sin anexos sueltos — el documento de origen se sube con todos sus anexos en un
-- solo PDF (mismo cambio que tables/09). Se borran los archivos de categoría ANTECEDENTE
-- y la columna DESCRIPCION (solo la usaban ellos).
-- ============================================
DELETE FROM "INFORME_ARCHIVOS" WHERE "CATEGORIA" = 'ANTECEDENTE';

IF OBJECT_ID('CHK_INFORME_ARCHIVOS_CATEGORIA', 'C') IS NOT NULL
    ALTER TABLE "INFORME_ARCHIVOS" DROP CONSTRAINT "CHK_INFORME_ARCHIVOS_CATEGORIA";
ALTER TABLE "INFORME_ARCHIVOS" ADD CONSTRAINT "CHK_INFORME_ARCHIVOS_CATEGORIA"
    CHECK ("CATEGORIA" IN ('OFICIAL', 'SOLICITUD'));
GO

IF COL_LENGTH('dbo.INFORME_ARCHIVOS', 'DESCRIPCION') IS NOT NULL
    ALTER TABLE "INFORME_ARCHIVOS" DROP COLUMN "DESCRIPCION";
GO
