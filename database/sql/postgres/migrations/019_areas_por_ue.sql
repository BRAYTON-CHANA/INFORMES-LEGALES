-- ============================================
-- 019: las áreas pertenecen a una unidad ejecutora (mismo cambio que tables/00, 07 y 08 y
-- seeds/02). El documento de origen procede de una UE (obligatoria) y, si se sabe, de una de
-- sus oficinas. Se quita ES_SEDE_CENTRAL: la Sede Central es la UE 001.
-- ============================================
ALTER TABLE "AREAS" ADD COLUMN IF NOT EXISTS "ID_UNIDAD_EJECUTORA" INT NULL;

-- Lo que hubiera antes era de la Sede: áreas sin UE e informes con área pero sin UE
UPDATE "AREAS" SET "ID_UNIDAD_EJECUTORA" = (SELECT MIN("ID_UNIDAD_EJECUTORA") FROM "UNIDADES_EJECUTORAS" WHERE "CODIGO" = '001')
WHERE "ID_UNIDAD_EJECUTORA" IS NULL;
UPDATE "INFORMES" i SET "ID_UE_SOLICITANTE" = a."ID_UNIDAD_EJECUTORA"
FROM "AREAS" a WHERE a."ID_AREA" = i."ID_AREA" AND i."ID_UE_SOLICITANTE" IS NULL;

ALTER TABLE "AREAS" ALTER COLUMN "ID_UNIDAD_EJECUTORA" SET NOT NULL;
ALTER TABLE "AREAS" DROP CONSTRAINT IF EXISTS "UQ_AREAS_NOMBRE";
ALTER TABLE "AREAS" DROP CONSTRAINT IF EXISTS "FK_AREAS_UNIDAD_EJECUTORA";
ALTER TABLE "AREAS" ADD CONSTRAINT "FK_AREAS_UNIDAD_EJECUTORA"
    FOREIGN KEY ("ID_UNIDAD_EJECUTORA") REFERENCES "UNIDADES_EJECUTORAS" ("ID_UNIDAD_EJECUTORA");
ALTER TABLE "AREAS" DROP CONSTRAINT IF EXISTS "UQ_AREAS_UE_NOMBRE";
ALTER TABLE "AREAS" ADD CONSTRAINT "UQ_AREAS_UE_NOMBRE" UNIQUE ("ID_UNIDAD_EJECUTORA", "NOMBRE");
ALTER TABLE "INFORMES" DROP CONSTRAINT IF EXISTS "CHK_INFORMES_AREA_CON_UE";
ALTER TABLE "INFORMES" ADD CONSTRAINT "CHK_INFORMES_AREA_CON_UE" CHECK ("ID_AREA" IS NULL OR "ID_UE_SOLICITANTE" IS NOT NULL);

DROP INDEX IF EXISTS "UX_UNIDADES_EJECUTORAS_SEDE";
ALTER TABLE "UNIDADES_EJECUTORAS" DROP COLUMN IF EXISTS "ES_SEDE_CENTRAL";

-- Oficinas o áreas de cada UE (101). Sede Central: página oficial "Gerencias Regionales" del GORE
-- Moquegua + órganos de alta dirección y control (Ley 27867). Demás UE: estructura típica de su sector
-- (ROF/MOF de UGEL, DRE, DIRESA, hospitales...): confirmar con cada UE y ajustar en Configuración → Áreas.
INSERT INTO "AREAS" ("ID_UNIDAD_EJECUTORA", "NOMBRE", "SIGLA")
SELECT u."ID_UNIDAD_EJECUTORA", v."NOMBRE", v."SIGLA" FROM (VALUES
    ('001', 'Gobernación Regional', NULL),
    ('001', 'Consejo Regional', NULL),
    ('001', 'Gerencia General Regional', 'GGR'),
    ('001', 'Secretaría General', NULL),
    ('001', 'Órgano de Control Institucional', 'OCI'),
    ('001', 'Procuraduría Pública Regional', 'PPR'),
    ('001', 'Oficina Regional de Asesoría Jurídica', 'ORAJ'),
    ('001', 'Oficina Regional de Administración', 'ORA'),
    ('001', 'Oficina de Recursos Humanos', NULL),
    ('001', 'Oficina de Logística y Servicios Generales', NULL),
    ('001', 'Oficina de Contabilidad', NULL),
    ('001', 'Oficina de Tesorería', NULL),
    ('001', 'Oficina de Control Patrimonial', NULL),
    ('001', 'Gerencia Regional de Planeamiento, Presupuesto y Acondicionamiento Territorial', 'GRPPAT'),
    ('001', 'Sub Gerencia de Planeamiento', NULL),
    ('001', 'Sub Gerencia de Presupuesto', NULL),
    ('001', 'Sub Gerencia de Acondicionamiento y Ordenamiento Territorial', NULL),
    ('001', 'Sub Gerencia Multianual de Inversiones', NULL),
    ('001', 'Sub Gerencia de Organización y Modernización Institucional', NULL),
    ('001', 'Gerencia Regional de Infraestructura', 'GRI'),
    ('001', 'Sub Gerencia de Estudios y Proyectos', NULL),
    ('001', 'Sub Gerencia de Obras', NULL),
    ('001', 'Sub Gerencia de Equipo Mecánico', NULL),
    ('001', 'Gerencia Regional de Recursos Naturales y Ambiente', 'GRRNA'),
    ('001', 'Sub Gerencia de Gestión Ambiental y Defensa Civil', NULL),
    ('001', 'Sub Gerencia de Desarrollo Estratégico de los Recursos Naturales', NULL),
    ('001', 'Gerencia Regional de Desarrollo Económico', 'GRDE'),
    ('001', 'Gerencia Regional de Desarrollo Social', 'GRDS'),
    ('001', 'Sub Gerencia de Desarrollo e Inclusión Social', NULL),
    ('001', 'Oficina Regional de Defensa Nacional, Civil y Seguridad Ciudadana', NULL),
    ('001', 'Dirección Regional de Comercio Exterior y Turismo', 'DIRCETUR'),
    ('001', 'Dirección Regional de Energía y Minas', 'DREM'),
    ('001', 'Dirección Regional de Vivienda, Construcción y Saneamiento', 'DRVCS'),
    ('001', 'Dirección Regional de la Producción', 'DIREPRO'),
    ('001', 'Dirección Regional de Trabajo y Promoción del Empleo', 'DRTPE'),
    ('002', 'Gerencia General', NULL),
    ('002', 'Oficina de Administración', NULL),
    ('002', 'Oficina de Planeamiento y Presupuesto', NULL),
    ('002', 'Oficina de Asesoría Jurídica', NULL),
    ('002', 'Oficina de Infraestructura', NULL),
    ('002', 'Dirección de Desarrollo Agrícola', NULL),
    ('003', 'Gerencia Sub Regional', NULL),
    ('003', 'Oficina de Administración', NULL),
    ('003', 'Oficina de Planeamiento y Presupuesto', NULL),
    ('003', 'Oficina de Asesoría Jurídica', NULL),
    ('003', 'Oficina de Infraestructura', NULL),
    ('004', 'Gerencia Sub Regional', NULL),
    ('004', 'Oficina de Administración', NULL),
    ('004', 'Oficina de Planeamiento y Presupuesto', NULL),
    ('004', 'Oficina de Asesoría Jurídica', NULL),
    ('004', 'Oficina de Infraestructura', NULL),
    ('100', 'Dirección Regional', NULL),
    ('100', 'Oficina de Administración', NULL),
    ('100', 'Oficina de Planeamiento', NULL),
    ('100', 'Oficina de Asesoría Jurídica', NULL),
    ('100', 'Dirección de Competitividad Agraria', NULL),
    ('100', 'Dirección de Titulación y Catastro Rural', NULL),
    ('200', 'Dirección Regional', NULL),
    ('200', 'Oficina de Administración', NULL),
    ('200', 'Oficina de Planeamiento', NULL),
    ('200', 'Oficina de Asesoría Jurídica', NULL),
    ('200', 'Dirección de Caminos', NULL),
    ('200', 'Dirección de Circulación Terrestre', NULL),
    ('300', 'Dirección Regional', NULL),
    ('300', 'Dirección de Gestión Pedagógica', NULL),
    ('300', 'Dirección de Gestión Institucional', NULL),
    ('300', 'Oficina de Administración', NULL),
    ('300', 'Oficina de Asesoría Jurídica', NULL),
    ('301', 'Dirección', NULL),
    ('301', 'Área de Gestión Pedagógica', 'AGP'),
    ('301', 'Área de Gestión Institucional', 'AGI'),
    ('301', 'Área de Gestión Administrativa', 'AGA'),
    ('301', 'Área de Asesoría Jurídica', 'AAJ'),
    ('302', 'Dirección', NULL),
    ('302', 'Área de Gestión Pedagógica', 'AGP'),
    ('302', 'Área de Gestión Institucional', 'AGI'),
    ('302', 'Área de Gestión Administrativa', 'AGA'),
    ('302', 'Área de Asesoría Jurídica', 'AAJ'),
    ('303', 'Dirección', NULL),
    ('303', 'Área de Gestión Pedagógica', 'AGP'),
    ('303', 'Área de Gestión Institucional', 'AGI'),
    ('303', 'Área de Gestión Administrativa', 'AGA'),
    ('303', 'Área de Asesoría Jurídica', 'AAJ'),
    ('400', 'Dirección Regional', NULL),
    ('400', 'Oficina Ejecutiva de Administración', NULL),
    ('400', 'Oficina Ejecutiva de Planeamiento', NULL),
    ('400', 'Oficina de Asesoría Jurídica', NULL),
    ('400', 'Dirección Ejecutiva de Salud de las Personas', NULL),
    ('400', 'Dirección Ejecutiva de Salud Ambiental', 'DESA'),
    ('400', 'Dirección Ejecutiva de Medicamentos, Insumos y Drogas', 'DIREMID'),
    ('400', 'Oficina de Epidemiología', NULL),
    ('401', 'Dirección', NULL),
    ('401', 'Oficina de Administración', NULL),
    ('401', 'Oficina de Planeamiento', NULL),
    ('401', 'Oficina de Asesoría Jurídica', NULL),
    ('401', 'Oficina de Personal', NULL),
    ('402', 'Dirección Ejecutiva', NULL),
    ('402', 'Oficina de Administración', NULL),
    ('402', 'Oficina de Planeamiento', NULL),
    ('402', 'Oficina de Asesoría Jurídica', NULL),
    ('402', 'Oficina de Personal', NULL)
) AS v ("CODIGO", "NOMBRE", "SIGLA")
JOIN "UNIDADES_EJECUTORAS" u ON u."CODIGO" = v."CODIGO"
WHERE NOT EXISTS (SELECT 1 FROM "AREAS" a WHERE a."ID_UNIDAD_EJECUTORA" = u."ID_UNIDAD_EJECUTORA" AND a."NOMBRE" = v."NOMBRE");
