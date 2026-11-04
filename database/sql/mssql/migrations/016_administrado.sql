-- ============================================
-- 016: nombre del administrado (la persona o empresa cuyo caso se atiende; Ley 27444).
-- Opcional (mismo cambio que tables/08).
-- ============================================
IF COL_LENGTH('dbo.INFORMES', 'NOMBRE_ADMINISTRADO') IS NULL
    ALTER TABLE "INFORMES" ADD "NOMBRE_ADMINISTRADO" NVARCHAR(300) NULL;
GO
