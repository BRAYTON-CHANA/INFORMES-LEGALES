-- ============================================
-- 017: se entra solo con el DNI (mismo cambio que tables/01). Se quita el usuario
-- personalizado (USUARIO); DNI pasa a obligatorio, único y de 8 dígitos. EMAIL queda
-- como dato de contacto opcional.
-- ============================================
IF COL_LENGTH('dbo.USUARIOS', 'USUARIO') IS NOT NULL
    EXEC sp_executesql N'UPDATE "USUARIOS" SET "DNI" = ''73130884'' WHERE "USUARIO" = ''admin'' AND "DNI" IS NULL';
GO

IF EXISTS (SELECT 1 FROM "USUARIOS" WHERE "DNI" IS NULL OR "DNI" NOT LIKE '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')
    THROW 50017, 'Hay cuentas sin DNI de 8 dígitos: complétalo en USUARIOS antes de migrar.', 1;
GO

-- Restricciones e índices sobre USUARIO y el índice filtrado del DNI
DECLARE @n SYSNAME, @s NVARCHAR(400);
WHILE 1 = 1
BEGIN
    SET @n = NULL;
    SELECT TOP 1 @n = k.name FROM sys.key_constraints k
    JOIN sys.index_columns ic ON ic.object_id = k.parent_object_id AND ic.index_id = k.unique_index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE k.parent_object_id = OBJECT_ID('dbo.USUARIOS') AND k.type = 'UQ' AND c.name IN ('USUARIO', 'DNI');
    IF @n IS NULL BREAK;
    SET @s = N'ALTER TABLE "USUARIOS" DROP CONSTRAINT ' + QUOTENAME(@n);
    EXEC sp_executesql @s;
END
WHILE 1 = 1
BEGIN
    SET @n = NULL;
    SELECT TOP 1 @n = i.name FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID('dbo.USUARIOS') AND i.is_primary_key = 0 AND i.is_unique_constraint = 0
      AND c.name IN ('USUARIO', 'DNI');
    IF @n IS NULL BREAK;
    SET @s = N'DROP INDEX ' + QUOTENAME(@n) + N' ON "USUARIOS"';
    EXEC sp_executesql @s;
END
GO

IF COL_LENGTH('dbo.USUARIOS', 'USUARIO') IS NOT NULL ALTER TABLE "USUARIOS" DROP COLUMN "USUARIO";
ALTER TABLE "USUARIOS" ALTER COLUMN "DNI" CHAR(8) NOT NULL;
GO

ALTER TABLE "USUARIOS" ADD CONSTRAINT "UQ_USUARIOS_DNI" UNIQUE ("DNI");
IF OBJECT_ID('CHK_USUARIOS_DNI', 'C') IS NULL
    ALTER TABLE "USUARIOS" ADD CONSTRAINT "CHK_USUARIOS_DNI" CHECK ("DNI" LIKE '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]');
GO
