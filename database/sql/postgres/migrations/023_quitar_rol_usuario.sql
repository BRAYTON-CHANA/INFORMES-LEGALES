-- ============================================
-- 023: se quita el rol "usuario" (venía de la plantilla y no da permisos: el sistema solo usa
-- admin, abogado y consulta). Mismo cambio que seeds/01_base. Las cuentas que solo tenían ese
-- rol y no dejaron rastro (informes, archivos, bitácora, búsquedas, roles asignados) se borran;
-- si dejaron rastro, se conservan sin rol (el admin les asigna uno).
-- ============================================
CREATE TEMP TABLE "TMP_QUITAR" ON COMMIT DROP AS
SELECT u."ID_USUARIO"
FROM "USUARIOS" u
WHERE u."ID_USUARIO" IN (SELECT ur."ID_USUARIO" FROM "USUARIO_ROL" ur JOIN "ROLES" r ON r."ID_ROL" = ur."ID_ROL" WHERE r."NOMBRE_ROL" = 'usuario')
  AND u."ID_USUARIO" NOT IN (SELECT ur."ID_USUARIO" FROM "USUARIO_ROL" ur JOIN "ROLES" r ON r."ID_ROL" = ur."ID_ROL" WHERE r."NOMBRE_ROL" <> 'usuario')
  AND NOT EXISTS (SELECT 1 FROM "INFORMES" i WHERE i."ID_USUARIO_REGISTRO" = u."ID_USUARIO" OR i."ID_USUARIO_PUBLICA" = u."ID_USUARIO")
  AND NOT EXISTS (SELECT 1 FROM "INFORME_ARCHIVOS" a WHERE a."ID_USUARIO" = u."ID_USUARIO")
  AND NOT EXISTS (SELECT 1 FROM "INFORME_AUDITORIA" a WHERE a."ID_USUARIO" = u."ID_USUARIO")
  AND NOT EXISTS (SELECT 1 FROM "INFORME_BUSQUEDAS" b WHERE b."ID_USUARIO" = u."ID_USUARIO")
  AND NOT EXISTS (SELECT 1 FROM "USUARIO_ROL" x WHERE x."ASIGNADO_POR" = u."ID_USUARIO");

DELETE FROM "USUARIO_ROL" WHERE "ID_USUARIO" IN (SELECT "ID_USUARIO" FROM "TMP_QUITAR");
DELETE FROM "USUARIOS" WHERE "ID_USUARIO" IN (SELECT "ID_USUARIO" FROM "TMP_QUITAR");

DELETE FROM "USUARIO_ROL" WHERE "ID_ROL" IN (SELECT "ID_ROL" FROM "ROLES" WHERE "NOMBRE_ROL" = 'usuario');
DELETE FROM "ROLES" WHERE "NOMBRE_ROL" = 'usuario';
