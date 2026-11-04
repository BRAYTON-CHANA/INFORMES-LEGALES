-- ============================================
-- AREAS: oficinas o áreas (unidades orgánicas) de cada unidad ejecutora que pueden firmar el
-- documento de origen. El nombre se repite entre UE (cada UGEL tiene su Área de Gestión Administrativa).
-- ============================================
IF OBJECT_ID('dbo.AREAS', 'U') IS NULL
BEGIN
    CREATE TABLE "AREAS" (
        "ID_AREA" INT IDENTITY(1,1) CONSTRAINT "PK_AREAS" PRIMARY KEY,
        "ID_UNIDAD_EJECUTORA" INT NOT NULL CONSTRAINT "FK_AREAS_UNIDAD_EJECUTORA" REFERENCES "UNIDADES_EJECUTORAS" ("ID_UNIDAD_EJECUTORA"),
        "NOMBRE" NVARCHAR(200) NOT NULL,
        "SIGLA" NVARCHAR(30) NULL,
        "ACTIVO" BIT NOT NULL CONSTRAINT "DF_AREAS_ACTIVO" DEFAULT 1,
        CONSTRAINT "UQ_AREAS_UE_NOMBRE" UNIQUE ("ID_UNIDAD_EJECUTORA", "NOMBRE")
    );
END
GO
