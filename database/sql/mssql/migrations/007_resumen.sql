-- ============================================
-- 007: resumen del informe (estructura fecha, materia, resumen, normativa; mismo cambio que tables/08)
-- Después de aplicarla: npm run informes:reindexar
-- ============================================
IF COL_LENGTH('dbo.INFORMES', 'RESUMEN') IS NULL
    ALTER TABLE "INFORMES" ADD "RESUMEN" NVARCHAR(3000) NULL;
GO
