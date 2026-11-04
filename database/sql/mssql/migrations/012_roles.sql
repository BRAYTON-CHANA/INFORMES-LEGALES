-- ============================================
-- 012: perfiles simples — admin, abogado y consulta (usuario regular). Se quita el rol
-- asesor_ejecutora: sus usuarios pasan a consulta (mismo cambio que seeds/01_base).
-- Ya no se comparte por usuario/rol/UE: INFORME_PERMISOS queda sin uso.
-- ============================================
IF NOT EXISTS (SELECT 1 FROM "ROLES" WHERE "NOMBRE_ROL" = 'consulta')
    INSERT INTO "ROLES" ("NOMBRE_ROL", "DESCRIPCION", "NIVEL_ACCESO", "ES_SISTEMA")
    VALUES ('consulta', N'Usuario regular: consulta y descarga los informes públicos', 1, 0);
UPDATE "ROLES" SET "DESCRIPCION" = N'Usuario regular: consulta y descarga los informes públicos' WHERE "NOMBRE_ROL" = 'consulta';

-- Quien tenía asesor_ejecutora recibe consulta (si no lo tenía)
INSERT INTO "USUARIO_ROL" ("ID_USUARIO", "ID_ROL", "FECHA_ASIGNACION")
SELECT ur."ID_USUARIO", c."ID_ROL", SYSDATETIMEOFFSET()
FROM "USUARIO_ROL" ur
JOIN "ROLES" a ON a."ID_ROL" = ur."ID_ROL" AND a."NOMBRE_ROL" = 'asesor_ejecutora'
CROSS JOIN "ROLES" c
WHERE c."NOMBRE_ROL" = 'consulta'
  AND NOT EXISTS (SELECT 1 FROM "USUARIO_ROL" x WHERE x."ID_USUARIO" = ur."ID_USUARIO" AND x."ID_ROL" = c."ID_ROL");

DELETE FROM "INFORME_PERMISOS" WHERE "ID_ROL" IN (SELECT "ID_ROL" FROM "ROLES" WHERE "NOMBRE_ROL" = 'asesor_ejecutora');
DELETE FROM "USUARIO_ROL" WHERE "ID_ROL" IN (SELECT "ID_ROL" FROM "ROLES" WHERE "NOMBRE_ROL" = 'asesor_ejecutora');
DELETE FROM "ROLES" WHERE "NOMBRE_ROL" = 'asesor_ejecutora';
GO
