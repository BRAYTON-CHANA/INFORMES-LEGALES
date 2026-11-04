-- ============================================
-- 026: los PDF pasan a Supabase Storage (bucket privado). INFORME_ARCHIVOS guarda la ruta del
-- objeto (RUTA_ARCHIVO) en vez del binario; CONTENIDO queda para instalaciones sin Storage
-- (ver lib/storage/archivos.js). Siempre debe haber uno de los dos. Mismo cambio que tables/.
-- ============================================
ALTER TABLE "INFORME_ARCHIVOS" ADD COLUMN IF NOT EXISTS "RUTA_ARCHIVO" VARCHAR(500) NULL;
ALTER TABLE "INFORME_ARCHIVOS" ALTER COLUMN "CONTENIDO" DROP NOT NULL;
ALTER TABLE "INFORME_ARCHIVOS" DROP CONSTRAINT IF EXISTS "CHK_INFORME_ARCHIVOS_ORIGEN";
ALTER TABLE "INFORME_ARCHIVOS" ADD CONSTRAINT "CHK_INFORME_ARCHIVOS_ORIGEN"
    CHECK ("CONTENIDO" IS NOT NULL OR "RUTA_ARCHIVO" IS NOT NULL);
