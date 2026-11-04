-- ============================================
-- UNIDADES_EJECUTORAS: unidades ejecutoras del pliego regional (CODIGO = número de UE; la 001 es
-- la Sede Central). Cada usuario pertenece a una; sus oficinas están en AREAS.
-- Va antes que USUARIOS porque USUARIOS la referencia.
-- ============================================
IF OBJECT_ID('dbo.UNIDADES_EJECUTORAS', 'U') IS NULL
BEGIN
    CREATE TABLE "UNIDADES_EJECUTORAS" (
        "ID_UNIDAD_EJECUTORA" INT IDENTITY(1,1) CONSTRAINT "PK_UNIDADES_EJECUTORAS" PRIMARY KEY,
        "CODIGO" NVARCHAR(10) NULL,
        "NOMBRE" NVARCHAR(200) NOT NULL CONSTRAINT "UQ_UNIDADES_EJECUTORAS_NOMBRE" UNIQUE,
        "SIGLA" NVARCHAR(30) NULL,
        "ACTIVO" BIT NOT NULL CONSTRAINT "DF_UNIDADES_EJECUTORAS_ACTIVO" DEFAULT 1
    );
END
GO
