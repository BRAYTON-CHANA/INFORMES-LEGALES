-- ============================================
-- 019: las áreas pertenecen a una unidad ejecutora (mismo cambio que tables/00, 07 y 08 y
-- seeds/02). El documento de origen procede de una UE (obligatoria) y, si se sabe, de una de
-- sus oficinas. Se quita ES_SEDE_CENTRAL: la Sede Central es la UE 001.
-- ============================================
IF COL_LENGTH('dbo.AREAS', 'ID_UNIDAD_EJECUTORA') IS NULL
    ALTER TABLE "AREAS" ADD "ID_UNIDAD_EJECUTORA" INT NULL;
GO

-- Lo que hubiera antes era de la Sede: áreas sin UE e informes con área pero sin UE
UPDATE "AREAS" SET "ID_UNIDAD_EJECUTORA" = (SELECT MIN("ID_UNIDAD_EJECUTORA") FROM "UNIDADES_EJECUTORAS" WHERE "CODIGO" = N'001')
WHERE "ID_UNIDAD_EJECUTORA" IS NULL;
UPDATE "INFORMES" SET "ID_UE_SOLICITANTE" = (SELECT a."ID_UNIDAD_EJECUTORA" FROM "AREAS" a WHERE a."ID_AREA" = "INFORMES"."ID_AREA")
WHERE "ID_AREA" IS NOT NULL AND "ID_UE_SOLICITANTE" IS NULL;
GO

ALTER TABLE "AREAS" ALTER COLUMN "ID_UNIDAD_EJECUTORA" INT NOT NULL;
IF OBJECT_ID('UQ_AREAS_NOMBRE', 'UQ') IS NOT NULL ALTER TABLE "AREAS" DROP CONSTRAINT "UQ_AREAS_NOMBRE";
IF OBJECT_ID('FK_AREAS_UNIDAD_EJECUTORA', 'F') IS NULL
    ALTER TABLE "AREAS" ADD CONSTRAINT "FK_AREAS_UNIDAD_EJECUTORA"
        FOREIGN KEY ("ID_UNIDAD_EJECUTORA") REFERENCES "UNIDADES_EJECUTORAS" ("ID_UNIDAD_EJECUTORA");
IF OBJECT_ID('UQ_AREAS_UE_NOMBRE', 'UQ') IS NULL
    ALTER TABLE "AREAS" ADD CONSTRAINT "UQ_AREAS_UE_NOMBRE" UNIQUE ("ID_UNIDAD_EJECUTORA", "NOMBRE");
IF OBJECT_ID('CHK_INFORMES_AREA_CON_UE', 'C') IS NULL
    ALTER TABLE "INFORMES" ADD CONSTRAINT "CHK_INFORMES_AREA_CON_UE" CHECK ("ID_AREA" IS NULL OR "ID_UE_SOLICITANTE" IS NOT NULL);
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_UNIDADES_EJECUTORAS_SEDE')
    DROP INDEX "UX_UNIDADES_EJECUTORAS_SEDE" ON "UNIDADES_EJECUTORAS";
DECLARE @df SYSNAME = (SELECT d.name FROM sys.default_constraints d
    JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
    WHERE d.parent_object_id = OBJECT_ID('dbo.UNIDADES_EJECUTORAS') AND c.name = 'ES_SEDE_CENTRAL');
IF @df IS NOT NULL
BEGIN
    DECLARE @s NVARCHAR(300) = N'ALTER TABLE "UNIDADES_EJECUTORAS" DROP CONSTRAINT ' + QUOTENAME(@df);
    EXEC sp_executesql @s;
END
IF COL_LENGTH('dbo.UNIDADES_EJECUTORAS', 'ES_SEDE_CENTRAL') IS NOT NULL
    ALTER TABLE "UNIDADES_EJECUTORAS" DROP COLUMN "ES_SEDE_CENTRAL";
GO

-- Oficinas o áreas de cada UE (101). Sede Central: página oficial "Gerencias Regionales" del GORE
-- Moquegua + órganos de alta dirección y control (Ley 27867). Demás UE: estructura típica de su sector
-- (ROF/MOF de UGEL, DRE, DIRESA, hospitales...): confirmar con cada UE y ajustar en Configuración → Áreas.
INSERT INTO "AREAS" ("ID_UNIDAD_EJECUTORA", "NOMBRE", "SIGLA")
SELECT u."ID_UNIDAD_EJECUTORA", v."NOMBRE", v."SIGLA" FROM (VALUES
    (N'001', N'Gobernación Regional', NULL),
    (N'001', N'Consejo Regional', NULL),
    (N'001', N'Gerencia General Regional', N'GGR'),
    (N'001', N'Secretaría General', NULL),
    (N'001', N'Órgano de Control Institucional', N'OCI'),
    (N'001', N'Procuraduría Pública Regional', N'PPR'),
    (N'001', N'Oficina Regional de Asesoría Jurídica', N'ORAJ'),
    (N'001', N'Oficina Regional de Administración', N'ORA'),
    (N'001', N'Oficina de Recursos Humanos', NULL),
    (N'001', N'Oficina de Logística y Servicios Generales', NULL),
    (N'001', N'Oficina de Contabilidad', NULL),
    (N'001', N'Oficina de Tesorería', NULL),
    (N'001', N'Oficina de Control Patrimonial', NULL),
    (N'001', N'Gerencia Regional de Planeamiento, Presupuesto y Acondicionamiento Territorial', N'GRPPAT'),
    (N'001', N'Sub Gerencia de Planeamiento', NULL),
    (N'001', N'Sub Gerencia de Presupuesto', NULL),
    (N'001', N'Sub Gerencia de Acondicionamiento y Ordenamiento Territorial', NULL),
    (N'001', N'Sub Gerencia Multianual de Inversiones', NULL),
    (N'001', N'Sub Gerencia de Organización y Modernización Institucional', NULL),
    (N'001', N'Gerencia Regional de Infraestructura', N'GRI'),
    (N'001', N'Sub Gerencia de Estudios y Proyectos', NULL),
    (N'001', N'Sub Gerencia de Obras', NULL),
    (N'001', N'Sub Gerencia de Equipo Mecánico', NULL),
    (N'001', N'Gerencia Regional de Recursos Naturales y Ambiente', N'GRRNA'),
    (N'001', N'Sub Gerencia de Gestión Ambiental y Defensa Civil', NULL),
    (N'001', N'Sub Gerencia de Desarrollo Estratégico de los Recursos Naturales', NULL),
    (N'001', N'Gerencia Regional de Desarrollo Económico', N'GRDE'),
    (N'001', N'Gerencia Regional de Desarrollo Social', N'GRDS'),
    (N'001', N'Sub Gerencia de Desarrollo e Inclusión Social', NULL),
    (N'001', N'Oficina Regional de Defensa Nacional, Civil y Seguridad Ciudadana', NULL),
    (N'001', N'Dirección Regional de Comercio Exterior y Turismo', N'DIRCETUR'),
    (N'001', N'Dirección Regional de Energía y Minas', N'DREM'),
    (N'001', N'Dirección Regional de Vivienda, Construcción y Saneamiento', N'DRVCS'),
    (N'001', N'Dirección Regional de la Producción', N'DIREPRO'),
    (N'001', N'Dirección Regional de Trabajo y Promoción del Empleo', N'DRTPE'),
    (N'002', N'Gerencia General', NULL),
    (N'002', N'Oficina de Administración', NULL),
    (N'002', N'Oficina de Planeamiento y Presupuesto', NULL),
    (N'002', N'Oficina de Asesoría Jurídica', NULL),
    (N'002', N'Oficina de Infraestructura', NULL),
    (N'002', N'Dirección de Desarrollo Agrícola', NULL),
    (N'003', N'Gerencia Sub Regional', NULL),
    (N'003', N'Oficina de Administración', NULL),
    (N'003', N'Oficina de Planeamiento y Presupuesto', NULL),
    (N'003', N'Oficina de Asesoría Jurídica', NULL),
    (N'003', N'Oficina de Infraestructura', NULL),
    (N'004', N'Gerencia Sub Regional', NULL),
    (N'004', N'Oficina de Administración', NULL),
    (N'004', N'Oficina de Planeamiento y Presupuesto', NULL),
    (N'004', N'Oficina de Asesoría Jurídica', NULL),
    (N'004', N'Oficina de Infraestructura', NULL),
    (N'100', N'Dirección Regional', NULL),
    (N'100', N'Oficina de Administración', NULL),
    (N'100', N'Oficina de Planeamiento', NULL),
    (N'100', N'Oficina de Asesoría Jurídica', NULL),
    (N'100', N'Dirección de Competitividad Agraria', NULL),
    (N'100', N'Dirección de Titulación y Catastro Rural', NULL),
    (N'200', N'Dirección Regional', NULL),
    (N'200', N'Oficina de Administración', NULL),
    (N'200', N'Oficina de Planeamiento', NULL),
    (N'200', N'Oficina de Asesoría Jurídica', NULL),
    (N'200', N'Dirección de Caminos', NULL),
    (N'200', N'Dirección de Circulación Terrestre', NULL),
    (N'300', N'Dirección Regional', NULL),
    (N'300', N'Dirección de Gestión Pedagógica', NULL),
    (N'300', N'Dirección de Gestión Institucional', NULL),
    (N'300', N'Oficina de Administración', NULL),
    (N'300', N'Oficina de Asesoría Jurídica', NULL),
    (N'301', N'Dirección', NULL),
    (N'301', N'Área de Gestión Pedagógica', N'AGP'),
    (N'301', N'Área de Gestión Institucional', N'AGI'),
    (N'301', N'Área de Gestión Administrativa', N'AGA'),
    (N'301', N'Área de Asesoría Jurídica', N'AAJ'),
    (N'302', N'Dirección', NULL),
    (N'302', N'Área de Gestión Pedagógica', N'AGP'),
    (N'302', N'Área de Gestión Institucional', N'AGI'),
    (N'302', N'Área de Gestión Administrativa', N'AGA'),
    (N'302', N'Área de Asesoría Jurídica', N'AAJ'),
    (N'303', N'Dirección', NULL),
    (N'303', N'Área de Gestión Pedagógica', N'AGP'),
    (N'303', N'Área de Gestión Institucional', N'AGI'),
    (N'303', N'Área de Gestión Administrativa', N'AGA'),
    (N'303', N'Área de Asesoría Jurídica', N'AAJ'),
    (N'400', N'Dirección Regional', NULL),
    (N'400', N'Oficina Ejecutiva de Administración', NULL),
    (N'400', N'Oficina Ejecutiva de Planeamiento', NULL),
    (N'400', N'Oficina de Asesoría Jurídica', NULL),
    (N'400', N'Dirección Ejecutiva de Salud de las Personas', NULL),
    (N'400', N'Dirección Ejecutiva de Salud Ambiental', N'DESA'),
    (N'400', N'Dirección Ejecutiva de Medicamentos, Insumos y Drogas', N'DIREMID'),
    (N'400', N'Oficina de Epidemiología', NULL),
    (N'401', N'Dirección', NULL),
    (N'401', N'Oficina de Administración', NULL),
    (N'401', N'Oficina de Planeamiento', NULL),
    (N'401', N'Oficina de Asesoría Jurídica', NULL),
    (N'401', N'Oficina de Personal', NULL),
    (N'402', N'Dirección Ejecutiva', NULL),
    (N'402', N'Oficina de Administración', NULL),
    (N'402', N'Oficina de Planeamiento', NULL),
    (N'402', N'Oficina de Asesoría Jurídica', NULL),
    (N'402', N'Oficina de Personal', NULL)
) AS v ("CODIGO", "NOMBRE", "SIGLA")
JOIN "UNIDADES_EJECUTORAS" u ON u."CODIGO" = v."CODIGO"
WHERE NOT EXISTS (SELECT 1 FROM "AREAS" a WHERE a."ID_UNIDAD_EJECUTORA" = u."ID_UNIDAD_EJECUTORA" AND a."NOMBRE" = v."NOMBRE");
GO
