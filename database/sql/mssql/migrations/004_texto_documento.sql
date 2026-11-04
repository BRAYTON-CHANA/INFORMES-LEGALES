-- ============================================
-- 004: texto del PDF oficial para buscar en su contenido (mismo cambio que tables/08)
-- Después de aplicarla: npm run informes:reindexar
-- ============================================
IF COL_LENGTH('dbo.INFORMES', 'TEXTO_DOCUMENTO') IS NULL
    ALTER TABLE "INFORMES" ADD "TEXTO_DOCUMENTO" NVARCHAR(MAX) NULL;
IF COL_LENGTH('dbo.INFORMES', 'TEXTO_EXTRAIDO') IS NULL
    ALTER TABLE "INFORMES" ADD "TEXTO_EXTRAIDO" BIT NULL;
GO
