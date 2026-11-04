-- ============================================
-- 025: las cuentas son solo de la ORAJ (repositorio público, 024): la unidad ejecutora del
-- usuario ya no se usa. Se quita de USUARIOS (y de VW_USUARIOS) y de INFORME_BUSQUEDAS, donde
-- se copiaba la del usuario. Mismo cambio que tables/ y views/.
-- ============================================
DROP VIEW IF EXISTS "VW_USUARIOS";

ALTER TABLE "USUARIOS" DROP CONSTRAINT IF EXISTS "FK_USUARIOS_UNIDAD_EJECUTORA";
ALTER TABLE "USUARIOS" DROP COLUMN IF EXISTS "ID_UNIDAD_EJECUTORA";

ALTER TABLE "INFORME_BUSQUEDAS" DROP CONSTRAINT IF EXISTS "FK_INFORME_BUSQUEDAS_UE";
ALTER TABLE "INFORME_BUSQUEDAS" DROP COLUMN IF EXISTS "ID_UNIDAD_EJECUTORA";

CREATE VIEW "VW_USUARIOS" AS
SELECT u."ID_USUARIO", u."DNI", u."NOMBRES", u."APELLIDOS", u."EMAIL",
       u."REQUIERE_CAMBIO_PASSWORD", u."INTENTOS_FALLIDOS", u."BLOQUEADO_HASTA", u."ACTIVO",
       u."FECHA_CREACION", u."FECHA_EDICION"
FROM "USUARIOS" u;
REVOKE ALL ON "VW_USUARIOS" FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON "VW_USUARIOS" FROM anon, authenticated;
  END IF;
END $$;
