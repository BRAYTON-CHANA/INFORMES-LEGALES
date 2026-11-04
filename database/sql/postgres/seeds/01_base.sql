-- ============================================
-- Seed base — roles: admin y abogado (los únicos que inician sesión; el repositorio es público)
-- El usuario admin lo crea scripts/run-sql.js (necesita bcrypt para el hash)
-- ============================================
INSERT INTO "ROLES" ("NOMBRE_ROL", "DESCRIPCION", "NIVEL_ACCESO", "ES_SISTEMA")
VALUES ('admin', 'Administrador del sistema', 100, TRUE),
       ('abogado', 'Registra y edita informes legales', 10, FALSE)
ON CONFLICT ("NOMBRE_ROL") DO NOTHING;
