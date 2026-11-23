-- ============================================
-- 006: quita la tabla EVENTOS del calendario de ejemplo (ya no se usa)
-- ============================================
IF OBJECT_ID('dbo.EVENTOS', 'U') IS NOT NULL
    DROP TABLE "EVENTOS";
