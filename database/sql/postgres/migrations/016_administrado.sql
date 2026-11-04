-- ============================================
-- 016: nombre del administrado (la persona o empresa cuyo caso se atiende; Ley 27444).
-- Opcional (mismo cambio que tables/08).
-- ============================================
ALTER TABLE "INFORMES" ADD COLUMN IF NOT EXISTS "NOMBRE_ADMINISTRADO" VARCHAR(300) NULL;
