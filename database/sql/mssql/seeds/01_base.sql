-- ============================================
-- Seed base — roles: admin y abogado (los únicos que inician sesión; el repositorio es público)
-- El usuario admin lo crea scripts/run-sql.js (necesita bcrypt para el hash)
-- ============================================
IF NOT EXISTS (SELECT 1 FROM "ROLES" WHERE "NOMBRE_ROL" = 'admin')
    INSERT INTO "ROLES" ("NOMBRE_ROL", "DESCRIPCION", "NIVEL_ACCESO", "ES_SISTEMA")
    VALUES ('admin', 'Administrador del sistema', 100, 1);

IF NOT EXISTS (SELECT 1 FROM "ROLES" WHERE "NOMBRE_ROL" = 'abogado')
    INSERT INTO "ROLES" ("NOMBRE_ROL", "DESCRIPCION", "NIVEL_ACCESO", "ES_SISTEMA")
    VALUES ('abogado', 'Registra y edita informes legales', 10, 0);
GO
