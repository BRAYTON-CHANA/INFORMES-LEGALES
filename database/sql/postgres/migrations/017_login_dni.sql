-- ============================================
-- 017: se entra solo con el DNI (mismo cambio que tables/01). Se quita el usuario
-- personalizado (USUARIO); DNI pasa a obligatorio, único y de 8 dígitos. EMAIL queda
-- como dato de contacto opcional.
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'USUARIOS' AND column_name = 'USUARIO') THEN
    UPDATE "USUARIOS" SET "DNI" = '73130884' WHERE "USUARIO" = 'admin' AND "DNI" IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM "USUARIOS" WHERE "DNI" IS NULL OR "DNI" !~ '^[0-9]{8}$') THEN
    RAISE EXCEPTION 'Hay cuentas sin DNI de 8 dígitos: complétalo en USUARIOS antes de migrar.';
  END IF;
END $$;

ALTER TABLE "USUARIOS" DROP COLUMN IF EXISTS "USUARIO";
DROP INDEX IF EXISTS "UX_USUARIOS_DNI";
ALTER TABLE "USUARIOS" ALTER COLUMN "DNI" SET NOT NULL;
ALTER TABLE "USUARIOS" DROP CONSTRAINT IF EXISTS "UQ_USUARIOS_DNI";
ALTER TABLE "USUARIOS" ADD CONSTRAINT "UQ_USUARIOS_DNI" UNIQUE ("DNI");
ALTER TABLE "USUARIOS" DROP CONSTRAINT IF EXISTS "CHK_USUARIOS_DNI";
ALTER TABLE "USUARIOS" ADD CONSTRAINT "CHK_USUARIOS_DNI" CHECK ("DNI" ~ '^[0-9]{8}$');
