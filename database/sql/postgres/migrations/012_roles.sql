-- ============================================
-- 012: perfiles simples — admin, abogado y consulta (usuario regular). Se quita el rol
-- asesor_ejecutora: sus usuarios pasan a consulta (mismo cambio que seeds/01_base).
-- Ya no se comparte por usuario/rol/UE: INFORME_PERMISOS queda sin uso.
-- ============================================
INSERT INTO "ROLES" ("NOMBRE_ROL", "DESCRIPCION", "NIVEL_ACCESO", "ES_SISTEMA")
VALUES ('consulta', 'Usuario regular: consulta y descarga los informes públicos', 1, FALSE)
ON CONFLICT ("NOMBRE_ROL") DO NOTHING;
UPDATE "ROLES" SET "DESCRIPCION" = 'Usuario regular: consulta y descarga los informes públicos' WHERE "NOMBRE_ROL" = 'consulta';

-- Quien tenía asesor_ejecutora recibe consulta (si no lo tenía)
INSERT INTO "USUARIO_ROL" ("ID_USUARIO", "ID_ROL", "FECHA_ASIGNACION")
SELECT ur."ID_USUARIO", c."ID_ROL", NOW()
FROM "USUARIO_ROL" ur
JOIN "ROLES" a ON a."ID_ROL" = ur."ID_ROL" AND a."NOMBRE_ROL" = 'asesor_ejecutora'
CROSS JOIN "ROLES" c
WHERE c."NOMBRE_ROL" = 'consulta'
ON CONFLICT ("ID_USUARIO", "ID_ROL") DO NOTHING;

DELETE FROM "INFORME_PERMISOS" WHERE "ID_ROL" IN (SELECT "ID_ROL" FROM "ROLES" WHERE "NOMBRE_ROL" = 'asesor_ejecutora');
DELETE FROM "USUARIO_ROL" WHERE "ID_ROL" IN (SELECT "ID_ROL" FROM "ROLES" WHERE "NOMBRE_ROL" = 'asesor_ejecutora');
DELETE FROM "ROLES" WHERE "NOMBRE_ROL" = 'asesor_ejecutora';
