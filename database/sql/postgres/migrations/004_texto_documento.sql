-- ============================================
-- 004: texto del PDF oficial para buscar en su contenido (mismo cambio que tables/08)
-- Después de aplicarla: npm run informes:reindexar
-- ============================================
ALTER TABLE "INFORMES" ADD COLUMN IF NOT EXISTS "TEXTO_DOCUMENTO" TEXT NULL;
ALTER TABLE "INFORMES" ADD COLUMN IF NOT EXISTS "TEXTO_EXTRAIDO" BOOLEAN NULL;
