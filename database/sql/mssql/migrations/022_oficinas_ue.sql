-- ============================================
-- 022: oficinas de cada unidad ejecutora según su directorio de funcionarios en gob.pe
-- (regionmoquegua-diresa, hospitalmoquegua, ugelilo, ugelmariscalnieto, regionmoquegua-dre, perpg,
-- regionmoquegua-dra, regionmoquegua-drtc, subregionilo) y el ROF 2017 del Hospital Ilo (Red de
-- Salud Ilo). Mismo cambio que seeds/02. Se renombran al nombre oficial (conservan su ID), se
-- desactivan las que no existen y se agregan las que faltaban (incluidas las de informática).
-- ============================================
-- Nombre oficial (solo si el anterior existe y el nuevo todavía no)
UPDATE a SET "NOMBRE" = v."NUEVO"
FROM "AREAS" a
JOIN "UNIDADES_EJECUTORAS" u ON u."ID_UNIDAD_EJECUTORA" = a."ID_UNIDAD_EJECUTORA"
JOIN (VALUES
    (N'400', N'Oficina Ejecutiva de Administración', N'Dirección de Gestión Administrativa'),
    (N'400', N'Oficina Ejecutiva de Planeamiento', N'Dirección de Planeamiento y Presupuesto'),
    (N'400', N'Oficina de Asesoría Jurídica', N'Unidad Funcional de Asesoría Jurídica'),
    (N'400', N'Dirección Ejecutiva de Salud de las Personas', N'Dirección Ejecutiva de Intervenciones Estratégicas en Salud Pública'),
    (N'400', N'Oficina de Epidemiología', N'Unidad Funcional de Epidemiología'),
    (N'402', N'Oficina de Planeamiento', N'Oficina de Planeamiento Estratégico'),
    (N'402', N'Oficina de Personal', N'Unidad de Personal'),
    (N'401', N'Dirección', N'Dirección de Red de Salud Ilo'),
    (N'401', N'Oficina de Administración', N'Unidad de Administración'),
    (N'401', N'Oficina de Planeamiento', N'Unidad de Planeamiento Estratégico'),
    (N'002', N'Oficina de Planeamiento y Presupuesto', N'Oficina de Planeamiento, Presupuesto y Modernización'),
    (N'002', N'Oficina de Infraestructura', N'Sub Gerencia de Inversiones'),
    (N'002', N'Dirección de Desarrollo Agrícola', N'Sub Gerencia de Proyectos y Desarrollo Agrícola'),
    (N'100', N'Oficina de Administración', N'Dirección de Administración'),
    (N'100', N'Oficina de Planeamiento', N'Oficina de Planeamiento y Presupuesto'),
    (N'100', N'Dirección de Competitividad Agraria', N'Dirección de Competitividad Agraria y Gestión de Recursos Naturales'),
    (N'100', N'Dirección de Titulación y Catastro Rural', N'Dirección de Saneamiento de la Propiedad Agraria y Catastro Rural'),
    (N'200', N'Oficina de Planeamiento', N'Oficina de Planificación y Presupuesto'),
    (N'003', N'Oficina de Administración', N'Oficina Sub Regional de Administración'),
    (N'003', N'Oficina de Asesoría Jurídica', N'Oficina Sub Regional de Asesoría Jurídica')
) AS v ("CODIGO", "VIEJO", "NUEVO") ON v."CODIGO" = u."CODIGO" AND v."VIEJO" = a."NOMBRE"
WHERE NOT EXISTS (SELECT 1 FROM "AREAS" b WHERE b."ID_UNIDAD_EJECUTORA" = a."ID_UNIDAD_EJECUTORA" AND b."NOMBRE" = v."NUEVO");
GO

-- No figuran en su directorio: se desactivan (no se borran)
UPDATE a SET "ACTIVO" = 0
FROM "AREAS" a
JOIN "UNIDADES_EJECUTORAS" u ON u."ID_UNIDAD_EJECUTORA" = a."ID_UNIDAD_EJECUTORA"
JOIN (VALUES
    (N'400', N'Dirección Ejecutiva de Salud Ambiental')
) AS v ("CODIGO", "NOMBRE") ON v."CODIGO" = u."CODIGO" AND v."NOMBRE" = a."NOMBRE";
GO

-- Las que faltaban
INSERT INTO "AREAS" ("ID_UNIDAD_EJECUTORA", "NOMBRE", "SIGLA")
SELECT u."ID_UNIDAD_EJECUTORA", v."NOMBRE", v."SIGLA" FROM (VALUES
    (N'400', N'Dirección de Gestión y Desarrollo de Recursos Humanos', NULL),
    (N'400', N'Unidad Funcional de Estadística e Informática', NULL),
    (N'400', N'Unidad Funcional de Contabilidad', NULL),
    (N'400', N'Unidad Funcional de Logística y Servicios Generales', NULL),
    (N'400', N'Unidad Funcional de Fiscalización, Control y Vigilancia Sanitaria', NULL),
    (N'400', N'Unidad Funcional de Gestión del Riesgo de Emergencias y Desastres', NULL),
    (N'400', N'Unidad Funcional de Aseguramiento e Intercambio Prestacional', NULL),
    (N'400', N'Unidad Funcional de Acceso a Medicamentos', NULL),
    (N'400', N'Unidad Funcional de Almacén Especializado', NULL),
    (N'402', N'Unidad de Economía', NULL),
    (N'402', N'Unidad de Logística', NULL),
    (N'402', N'Unidad de Seguros', NULL),
    (N'402', N'Unidad de Servicios Generales y Mantenimiento', NULL),
    (N'402', N'Unidad de Gestión de la Calidad', NULL),
    (N'402', N'Unidad de Epidemiología y Salud Ambiental', NULL),
    (N'402', N'Unidad de Apoyo a la Docencia e Investigación', NULL),
    (N'402', N'Unidad de Estadística e Informática', NULL),
    (N'402', N'Órgano de Control Institucional', N'OCI'),
    (N'401', N'Hospital Ilo', NULL),
    (N'401', N'Órgano de Control Institucional', N'OCI'),
    (N'401', N'Unidad de Epidemiología y Salud Ambiental', NULL),
    (N'401', N'Unidad de Estadística e Informática', NULL),
    (N'401', N'Unidad de Apoyo a la Docencia e Investigación', NULL),
    (N'300', N'Oficina de Recursos Humanos', NULL),
    (N'300', N'Órgano de Control Institucional', N'OCI'),
    (N'300', N'Trámite Documentario', NULL),
    (N'300', N'UGEL San Ignacio de Loyola – Ichuña', N'UGEL SIL'),
    (N'301', N'Órgano de Control Institucional', N'OCI'),
    (N'100', N'Agencia Agraria Mariscal Nieto', NULL),
    (N'100', N'Agencia Agraria General Sánchez Cerro', NULL),
    (N'100', N'Agencia Agraria Carumas', NULL),
    (N'100', N'Agencia Agraria Ichuña', NULL),
    (N'100', N'Unidad Funcional de Infraestructura y Servicios Agrarios', NULL),
    (N'100', N'Unidad Ejecutora de Inversiones', NULL),
    (N'200', N'Unidad de Administración Financiera', NULL),
    (N'200', N'Unidad de Recursos Humanos', NULL),
    (N'200', N'Dirección de Comunicaciones', NULL),
    (N'003', N'Oficina Sub Regional de Supervisión y Liquidación', NULL),
    (N'003', N'Oficina de Mantenimiento', NULL),
    (N'003', N'Unidad Funcional de Abastecimiento', NULL)
) AS v ("CODIGO", "NOMBRE", "SIGLA")
JOIN "UNIDADES_EJECUTORAS" u ON u."CODIGO" = v."CODIGO"
WHERE NOT EXISTS (SELECT 1 FROM "AREAS" a WHERE a."ID_UNIDAD_EJECUTORA" = u."ID_UNIDAD_EJECUTORA" AND a."NOMBRE" = v."NOMBRE");
GO
