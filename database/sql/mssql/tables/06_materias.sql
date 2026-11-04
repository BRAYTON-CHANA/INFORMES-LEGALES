-- ============================================
-- MATERIAS: materia jurídica del informe (contrataciones, personal, presupuesto...)
-- ============================================
IF OBJECT_ID('dbo.MATERIAS', 'U') IS NULL
BEGIN
    CREATE TABLE "MATERIAS" (
        "ID_MATERIA" INT IDENTITY(1,1) CONSTRAINT "PK_MATERIAS" PRIMARY KEY,
        "NOMBRE" NVARCHAR(150) NOT NULL CONSTRAINT "UQ_MATERIAS_NOMBRE" UNIQUE,
        "ACTIVO" BIT NOT NULL CONSTRAINT "DF_MATERIAS_ACTIVO" DEFAULT 1
    );
END
GO
