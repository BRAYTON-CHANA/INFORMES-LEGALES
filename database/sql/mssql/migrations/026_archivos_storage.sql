-- ============================================
-- 026: los PDF pasan a Supabase Storage (bucket privado). INFORME_ARCHIVOS guarda la ruta del
-- objeto (RUTA_ARCHIVO) en vez del binario; CONTENIDO queda para instalaciones sin Storage
-- (ver lib/storage/archivos.js). Siempre debe haber uno de los dos. Mismo cambio que tables/.
-- ============================================
IF COL_LENGTH('dbo.INFORME_ARCHIVOS', 'RUTA_ARCHIVO') IS NULL
    ALTER TABLE "INFORME_ARCHIVOS" ADD "RUTA_ARCHIVO" NVARCHAR(500) NULL;
ALTER TABLE "INFORME_ARCHIVOS" ALTER COLUMN "CONTENIDO" VARBINARY(MAX) NULL;
GO

IF OBJECT_ID('CHK_INFORME_ARCHIVOS_ORIGEN', 'C') IS NULL
    ALTER TABLE "INFORME_ARCHIVOS" ADD CONSTRAINT "CHK_INFORME_ARCHIVOS_ORIGEN"
        CHECK ("CONTENIDO" IS NOT NULL OR "RUTA_ARCHIVO" IS NOT NULL);
GO
