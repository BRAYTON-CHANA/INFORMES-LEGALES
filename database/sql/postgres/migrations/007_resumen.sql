-- ============================================
-- 007: resumen del informe (estructura fecha, materia, resumen, normativa; mismo cambio que tables/08)
-- Después de aplicarla: npm run informes:reindexar
-- ============================================
ALTER TABLE "INFORMES" ADD COLUMN IF NOT EXISTS "RESUMEN" VARCHAR(3000) NULL;
