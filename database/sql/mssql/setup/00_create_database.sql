-- ============================================
-- 00: Crear base de datos, login y usuario
-- Ejecutar contra la BD 'master' con un login administrador (sa)
-- Los placeholders {{...}} se reemplazan desde .env por scripts/run-sql.js
-- ============================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '{{DB_DATABASE}}')
BEGIN
    CREATE DATABASE [{{DB_DATABASE}}];
    PRINT 'Base de datos {{DB_DATABASE}} creada';
END
ELSE
    PRINT 'Base de datos {{DB_DATABASE}} ya existe';
GO

IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = '{{DB_USER}}')
BEGIN
    CREATE LOGIN [{{DB_USER}}] WITH PASSWORD = '{{DB_PASSWORD}}',
        CHECK_POLICY = OFF, CHECK_EXPIRATION = OFF;
    PRINT 'Login {{DB_USER}} creado';
END
ELSE
BEGIN
    -- Mantener la contraseña sincronizada con .env
    ALTER LOGIN [{{DB_USER}}] WITH PASSWORD = '{{DB_PASSWORD}}';
    PRINT 'Login {{DB_USER}} ya existía (password actualizado)';
END
GO

USE [{{DB_DATABASE}}];
GO

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = '{{DB_USER}}')
BEGIN
    CREATE USER [{{DB_USER}}] FOR LOGIN [{{DB_USER}}];
    PRINT 'Usuario {{DB_USER}} creado en {{DB_DATABASE}}';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.database_role_members rm
    JOIN sys.database_principals r ON rm.role_principal_id = r.principal_id
    JOIN sys.database_principals u ON rm.member_principal_id = u.principal_id
    WHERE r.name = 'db_owner' AND u.name = '{{DB_USER}}'
)
BEGIN
    ALTER ROLE db_owner ADD MEMBER [{{DB_USER}}];
    PRINT 'Usuario {{DB_USER}} agregado a db_owner';
END
GO
