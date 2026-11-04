-- ============================================
-- 022: oficinas de cada unidad ejecutora según su directorio de funcionarios en gob.pe
-- (regionmoquegua-diresa, hospitalmoquegua, ugelilo, ugelmariscalnieto, regionmoquegua-dre, perpg,
-- regionmoquegua-dra, regionmoquegua-drtc, subregionilo) y el ROF 2017 del Hospital Ilo (Red de
-- Salud Ilo). Mismo cambio que seeds/02. Se renombran al nombre oficial (conservan su ID), se
-- desactivan las que no existen y se agregan las que faltaban (incluidas las de informática).
-- ============================================
-- Nombre oficial (solo si el anterior existe y el nuevo todavía no)
UPDATE "AREAS" a SET "NOMBRE" = v."NUEVO"
FROM "UNIDADES_EJECUTORAS" u, (VALUES
    ('400', 'Oficina Ejecutiva de Administración', 'Dirección de Gestión Administrativa'),
    ('400', 'Oficina Ejecutiva de Planeamiento', 'Dirección de Planeamiento y Presupuesto'),
    ('400', 'Oficina de Asesoría Jurídica', 'Unidad Funcional de Asesoría Jurídica'),
    ('400', 'Dirección Ejecutiva de Salud de las Personas', 'Dirección Ejecutiva de Intervenciones Estratégicas en Salud Pública'),
    ('400', 'Oficina de Epidemiología', 'Unidad Funcional de Epidemiología'),
    ('402', 'Oficina de Planeamiento', 'Oficina de Planeamiento Estratégico'),
    ('402', 'Oficina de Personal', 'Unidad de Personal'),
    ('401', 'Dirección', 'Dirección de Red de Salud Ilo'),
    ('401', 'Oficina de Administración', 'Unidad de Administración'),
    ('401', 'Oficina de Planeamiento', 'Unidad de Planeamiento Estratégico'),
    ('002', 'Oficina de Planeamiento y Presupuesto', 'Oficina de Planeamiento, Presupuesto y Modernización'),
    ('002', 'Oficina de Infraestructura', 'Sub Gerencia de Inversiones'),
    ('002', 'Dirección de Desarrollo Agrícola', 'Sub Gerencia de Proyectos y Desarrollo Agrícola'),
    ('100', 'Oficina de Administración', 'Dirección de Administración'),
    ('100', 'Oficina de Planeamiento', 'Oficina de Planeamiento y Presupuesto'),
    ('100', 'Dirección de Competitividad Agraria', 'Dirección de Competitividad Agraria y Gestión de Recursos Naturales'),
    ('100', 'Dirección de Titulación y Catastro Rural', 'Dirección de Saneamiento de la Propiedad Agraria y Catastro Rural'),
    ('200', 'Oficina de Planeamiento', 'Oficina de Planificación y Presupuesto'),
    ('003', 'Oficina de Administración', 'Oficina Sub Regional de Administración'),
    ('003', 'Oficina de Asesoría Jurídica', 'Oficina Sub Regional de Asesoría Jurídica')
) AS v ("CODIGO", "VIEJO", "NUEVO")
WHERE u."ID_UNIDAD_EJECUTORA" = a."ID_UNIDAD_EJECUTORA" AND v."CODIGO" = u."CODIGO" AND v."VIEJO" = a."NOMBRE"
  AND NOT EXISTS (SELECT 1 FROM "AREAS" b WHERE b."ID_UNIDAD_EJECUTORA" = a."ID_UNIDAD_EJECUTORA" AND b."NOMBRE" = v."NUEVO");

-- No figuran en su directorio: se desactivan (no se borran)
UPDATE "AREAS" a SET "ACTIVO" = FALSE
FROM "UNIDADES_EJECUTORAS" u, (VALUES
    ('400', 'Dirección Ejecutiva de Salud Ambiental')
) AS v ("CODIGO", "NOMBRE")
WHERE u."ID_UNIDAD_EJECUTORA" = a."ID_UNIDAD_EJECUTORA" AND v."CODIGO" = u."CODIGO" AND v."NOMBRE" = a."NOMBRE";

-- Las que faltaban
INSERT INTO "AREAS" ("ID_UNIDAD_EJECUTORA", "NOMBRE", "SIGLA")
SELECT u."ID_UNIDAD_EJECUTORA", v."NOMBRE", v."SIGLA" FROM (VALUES
    ('400', 'Dirección de Gestión y Desarrollo de Recursos Humanos', NULL),
    ('400', 'Unidad Funcional de Estadística e Informática', NULL),
    ('400', 'Unidad Funcional de Contabilidad', NULL),
    ('400', 'Unidad Funcional de Logística y Servicios Generales', NULL),
    ('400', 'Unidad Funcional de Fiscalización, Control y Vigilancia Sanitaria', NULL),
    ('400', 'Unidad Funcional de Gestión del Riesgo de Emergencias y Desastres', NULL),
    ('400', 'Unidad Funcional de Aseguramiento e Intercambio Prestacional', NULL),
    ('400', 'Unidad Funcional de Acceso a Medicamentos', NULL),
    ('400', 'Unidad Funcional de Almacén Especializado', NULL),
    ('402', 'Unidad de Economía', NULL),
    ('402', 'Unidad de Logística', NULL),
    ('402', 'Unidad de Seguros', NULL),
    ('402', 'Unidad de Servicios Generales y Mantenimiento', NULL),
    ('402', 'Unidad de Gestión de la Calidad', NULL),
    ('402', 'Unidad de Epidemiología y Salud Ambiental', NULL),
    ('402', 'Unidad de Apoyo a la Docencia e Investigación', NULL),
    ('402', 'Unidad de Estadística e Informática', NULL),
    ('402', 'Órgano de Control Institucional', 'OCI'),
    ('401', 'Hospital Ilo', NULL),
    ('401', 'Órgano de Control Institucional', 'OCI'),
    ('401', 'Unidad de Epidemiología y Salud Ambiental', NULL),
    ('401', 'Unidad de Estadística e Informática', NULL),
    ('401', 'Unidad de Apoyo a la Docencia e Investigación', NULL),
    ('300', 'Oficina de Recursos Humanos', NULL),
    ('300', 'Órgano de Control Institucional', 'OCI'),
    ('300', 'Trámite Documentario', NULL),
    ('300', 'UGEL San Ignacio de Loyola – Ichuña', 'UGEL SIL'),
    ('301', 'Órgano de Control Institucional', 'OCI'),
    ('100', 'Agencia Agraria Mariscal Nieto', NULL),
    ('100', 'Agencia Agraria General Sánchez Cerro', NULL),
    ('100', 'Agencia Agraria Carumas', NULL),
    ('100', 'Agencia Agraria Ichuña', NULL),
    ('100', 'Unidad Funcional de Infraestructura y Servicios Agrarios', NULL),
    ('100', 'Unidad Ejecutora de Inversiones', NULL),
    ('200', 'Unidad de Administración Financiera', NULL),
    ('200', 'Unidad de Recursos Humanos', NULL),
    ('200', 'Dirección de Comunicaciones', NULL),
    ('003', 'Oficina Sub Regional de Supervisión y Liquidación', NULL),
    ('003', 'Oficina de Mantenimiento', NULL),
    ('003', 'Unidad Funcional de Abastecimiento', NULL)
) AS v ("CODIGO", "NOMBRE", "SIGLA")
JOIN "UNIDADES_EJECUTORAS" u ON u."CODIGO" = v."CODIGO"
WHERE NOT EXISTS (SELECT 1 FROM "AREAS" a WHERE a."ID_UNIDAD_EJECUTORA" = u."ID_UNIDAD_EJECUTORA" AND a."NOMBRE" = v."NOMBRE");
