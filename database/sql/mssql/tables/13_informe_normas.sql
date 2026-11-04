-- ============================================
-- INFORME_NORMAS: normativa asociada a cada informe: el texto de la norma (elegido del catálogo
-- NORMAS, que solo sugiere, o escrito a mano) + artículos citados
-- ============================================
IF OBJECT_ID('dbo.INFORME_NORMAS', 'U') IS NULL
BEGIN
    CREATE TABLE "INFORME_NORMAS" (
        "ID_INFORME_NORMA" INT IDENTITY(1,1) CONSTRAINT "PK_INFORME_NORMAS" PRIMARY KEY,
        "ID_INFORME" INT NOT NULL CONSTRAINT "FK_INFORME_NORMAS_INFORME" REFERENCES "INFORMES" ("ID_INFORME"),
        "NORMA" NVARCHAR(500) NOT NULL,
        "ARTICULOS" NVARCHAR(300) NULL,
        "ORDEN" INT NOT NULL CONSTRAINT "DF_INFORME_NORMAS_ORDEN" DEFAULT 0,
        CONSTRAINT "UQ_INFORME_NORMAS" UNIQUE ("ID_INFORME", "NORMA")
    );
END
GO
