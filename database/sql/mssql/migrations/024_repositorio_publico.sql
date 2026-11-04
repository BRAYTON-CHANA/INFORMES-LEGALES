-- ============================================
-- 024: el repositorio es público. Sin sesión se buscan, ven y descargan los informes
-- públicos y vigentes; solo admin y abogado inician sesión. Mismo cambio que tables/ y seeds/.
--  1. Bitácora y búsquedas admiten ID_USUARIO NULL (= visitante sin sesión).
--  2. Se quita el rol "consulta". Sus cuentas sin otro rol y sin rastro se borran; con rastro
--     (bitácora, búsquedas…) se conservan desactivadas para no perder los reportes.
-- ============================================
ALTER TABLE "INFORME_AUDITORIA" ALTER COLUMN "ID_USUARIO" INT NULL;
-- La columna está en un índice: se quita y se vuelve a crear alrededor del ALTER
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_INFORME_BUSQUEDAS_USUARIO' AND object_id = OBJECT_ID('dbo.INFORME_BUSQUEDAS'))
    DROP INDEX "IX_INFORME_BUSQUEDAS_USUARIO" ON "INFORME_BUSQUEDAS";
ALTER TABLE "INFORME_BUSQUEDAS" ALTER COLUMN "ID_USUARIO" INT NULL;
CREATE INDEX "IX_INFORME_BUSQUEDAS_USUARIO" ON "INFORME_BUSQUEDAS" ("ID_USUARIO");
GO

SELECT u."ID_USUARIO" INTO #CONSULTA
FROM "USUARIOS" u
WHERE u."ID_USUARIO" IN (SELECT ur."ID_USUARIO" FROM "USUARIO_ROL" ur JOIN "ROLES" r ON r."ID_ROL" = ur."ID_ROL" WHERE r."NOMBRE_ROL" = 'consulta')
  AND u."ID_USUARIO" NOT IN (SELECT ur."ID_USUARIO" FROM "USUARIO_ROL" ur JOIN "ROLES" r ON r."ID_ROL" = ur."ID_ROL" WHERE r."NOMBRE_ROL" <> 'consulta');

UPDATE "USUARIOS" SET "ACTIVO" = 0 WHERE "ID_USUARIO" IN (SELECT "ID_USUARIO" FROM #CONSULTA);

DELETE FROM "USUARIO_ROL" WHERE "ID_ROL" IN (SELECT "ID_ROL" FROM "ROLES" WHERE "NOMBRE_ROL" = 'consulta');

DELETE u FROM "USUARIOS" u
WHERE u."ID_USUARIO" IN (SELECT "ID_USUARIO" FROM #CONSULTA)
  AND NOT EXISTS (SELECT 1 FROM "INFORMES" i WHERE i."ID_USUARIO_REGISTRO" = u."ID_USUARIO" OR i."ID_USUARIO_PUBLICA" = u."ID_USUARIO")
  AND NOT EXISTS (SELECT 1 FROM "INFORME_ARCHIVOS" a WHERE a."ID_USUARIO" = u."ID_USUARIO")
  AND NOT EXISTS (SELECT 1 FROM "INFORME_AUDITORIA" a WHERE a."ID_USUARIO" = u."ID_USUARIO")
  AND NOT EXISTS (SELECT 1 FROM "INFORME_BUSQUEDAS" b WHERE b."ID_USUARIO" = u."ID_USUARIO")
  AND NOT EXISTS (SELECT 1 FROM "USUARIO_ROL" x WHERE x."ASIGNADO_POR" = u."ID_USUARIO");
DROP TABLE #CONSULTA;

DELETE FROM "ROLES" WHERE "NOMBRE_ROL" = 'consulta';
GO
