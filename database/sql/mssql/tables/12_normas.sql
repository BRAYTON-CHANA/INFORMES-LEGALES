-- ============================================
-- NORMAS: catálogo de normas (leyes, decretos, ordenanzas, directivas) para la
-- normativa asociada de cada informe
-- ============================================
IF OBJECT_ID('dbo.NORMAS', 'U') IS NULL
BEGIN
    CREATE TABLE "NORMAS" (
        "ID_NORMA" INT IDENTITY(1,1) CONSTRAINT "PK_NORMAS" PRIMARY KEY,
        "DENOMINACION" NVARCHAR(300) NOT NULL CONSTRAINT "UQ_NORMAS_DENOMINACION" UNIQUE,
        "TIPO" NVARCHAR(50) NULL,
        "NUMERO" NVARCHAR(50) NULL,
        "ACTIVO" BIT NOT NULL CONSTRAINT "DF_NORMAS_ACTIVO" DEFAULT 1
    );
END
GO
