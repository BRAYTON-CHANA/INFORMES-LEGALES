-- ============================================
-- 024: el repositorio es público. Sin sesión se buscan, ven y descargan los informes
-- públicos y vigentes; solo admin y abogado inician sesión. Mismo cambio que tables/ y seeds/.
--  1. Bitácora y búsquedas admiten ID_USUARIO NULL (= visitante sin sesión).
--  2. Se quita el rol "consulta". Sus cuentas sin otro rol y sin rastro se borran; con rastro
--     (bitácora, búsquedas…) se conservan desactivadas para no perder los reportes.
-- ============================================
ALTER TABLE "INFORME_AUDITORIA" ALTER COLUMN "ID_USUARIO" DROP NOT NULL;
ALTER TABLE "INFORME_BUSQUEDAS" ALTER COLUMN "ID_USUARIO" DROP NOT NULL;

CREATE TEMP TABLE "TMP_CONSULTA" ON COMMIT DROP AS
SELECT u."ID_USUARIO"
FROM "USUARIOS" u
WHERE u."ID_USUARIO" IN (SELECT ur."ID_USUARIO" FROM "USUARIO_ROL" ur JOIN "ROLES" r ON r."ID_ROL" = ur."ID_ROL" WHERE r."NOMBRE_ROL" = 'consulta')
  AND u."ID_USUARIO" NOT IN (SELECT ur."ID_USUARIO" FROM "USUARIO_ROL" ur JOIN "ROLES" r ON r."ID_ROL" = ur."ID_ROL" WHERE r."NOMBRE_ROL" <> 'consulta');

UPDATE "USUARIOS" SET "ACTIVO" = FALSE WHERE "ID_USUARIO" IN (SELECT "ID_USUARIO" FROM "TMP_CONSULTA");

DELETE FROM "USUARIO_ROL" WHERE "ID_ROL" IN (SELECT "ID_ROL" FROM "ROLES" WHERE "NOMBRE_ROL" = 'consulta');

DELETE FROM "USUARIOS" u
WHERE u."ID_USUARIO" IN (SELECT "ID_USUARIO" FROM "TMP_CONSULTA")
  AND NOT EXISTS (SELECT 1 FROM "INFORMES" i WHERE i."ID_USUARIO_REGISTRO" = u."ID_USUARIO" OR i."ID_USUARIO_PUBLICA" = u."ID_USUARIO")
  AND NOT EXISTS (SELECT 1 FROM "INFORME_ARCHIVOS" a WHERE a."ID_USUARIO" = u."ID_USUARIO")
  AND NOT EXISTS (SELECT 1 FROM "INFORME_AUDITORIA" a WHERE a."ID_USUARIO" = u."ID_USUARIO")
  AND NOT EXISTS (SELECT 1 FROM "INFORME_BUSQUEDAS" b WHERE b."ID_USUARIO" = u."ID_USUARIO")
  AND NOT EXISTS (SELECT 1 FROM "USUARIO_ROL" x WHERE x."ASIGNADO_POR" = u."ID_USUARIO");

DELETE FROM "ROLES" WHERE "NOMBRE_ROL" = 'consulta';
