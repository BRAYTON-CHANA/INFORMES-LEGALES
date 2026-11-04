-- ============================================
-- 015: la normativa del informe se guarda como texto (INFORME_NORMAS.NORMA), no como id.
-- El catálogo NORMAS queda solo como sugerencia al escribir; una norma que no está se
-- escribe a mano sin agregarla al catálogo (mismo cambio que tables/13).
-- ============================================
ALTER TABLE "INFORME_NORMAS" ADD COLUMN IF NOT EXISTS "NORMA" VARCHAR(500) NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'INFORME_NORMAS' AND column_name = 'ID_NORMA') THEN
    UPDATE "INFORME_NORMAS" x SET "NORMA" = COALESCE(
      (SELECT n."DENOMINACION" FROM "NORMAS" n WHERE n."ID_NORMA" = x."ID_NORMA"), 'Norma ' || x."ID_NORMA")
    WHERE x."NORMA" IS NULL;
  END IF;
END $$;

ALTER TABLE "INFORME_NORMAS" ALTER COLUMN "NORMA" SET NOT NULL;
ALTER TABLE "INFORME_NORMAS" DROP CONSTRAINT IF EXISTS "UQ_INFORME_NORMAS";
ALTER TABLE "INFORME_NORMAS" DROP COLUMN IF EXISTS "ID_NORMA";
ALTER TABLE "INFORME_NORMAS" ADD CONSTRAINT "UQ_INFORME_NORMAS" UNIQUE ("ID_INFORME", "NORMA");
