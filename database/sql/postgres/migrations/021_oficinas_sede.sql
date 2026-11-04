-- ============================================
-- 021: oficinas de la Sede Central (UE 001) según el directorio de funcionarios del GORE
-- Moquegua en gob.pe (mismo cambio que seeds/02). Nombres oficiales, 8 oficinas que faltaban
-- y la Oficina de Defensa Nacional se desactiva (sus funciones están en la Gerencia Regional de
-- Gestión del Riesgo de Desastres). Nada se borra.
-- ============================================
UPDATE "AREAS" a SET "NOMBRE" = 'Gerencia Regional de Recursos Naturales y Gestión del Medio Ambiente', "SIGLA" = 'GRRNGMA'
FROM "UNIDADES_EJECUTORAS" u
WHERE u."ID_UNIDAD_EJECUTORA" = a."ID_UNIDAD_EJECUTORA" AND u."CODIGO" = '001'
  AND a."NOMBRE" = 'Gerencia Regional de Recursos Naturales y Ambiente';
UPDATE "AREAS" a SET "NOMBRE" = 'Sub Gerencia de Gestión Ambiental'
FROM "UNIDADES_EJECUTORAS" u
WHERE u."ID_UNIDAD_EJECUTORA" = a."ID_UNIDAD_EJECUTORA" AND u."CODIGO" = '001'
  AND a."NOMBRE" = 'Sub Gerencia de Gestión Ambiental y Defensa Civil';
UPDATE "AREAS" a SET "NOMBRE" = 'Sub Gerencia de Programación Multianual de Inversiones'
FROM "UNIDADES_EJECUTORAS" u
WHERE u."ID_UNIDAD_EJECUTORA" = a."ID_UNIDAD_EJECUTORA" AND u."CODIGO" = '001'
  AND a."NOMBRE" = 'Sub Gerencia Multianual de Inversiones';
UPDATE "AREAS" a SET "ACTIVO" = FALSE
FROM "UNIDADES_EJECUTORAS" u
WHERE u."ID_UNIDAD_EJECUTORA" = a."ID_UNIDAD_EJECUTORA" AND u."CODIGO" = '001'
  AND a."NOMBRE" = 'Oficina Regional de Defensa Nacional, Civil y Seguridad Ciudadana';

INSERT INTO "AREAS" ("ID_UNIDAD_EJECUTORA", "NOMBRE", "SIGLA")
SELECT u."ID_UNIDAD_EJECUTORA", v."NOMBRE", v."SIGLA" FROM (VALUES
    ('Vicegobernación Regional', NULL),
    ('Oficina Regional de Tecnologías de la Información y Comunicación', 'ORTIC'),
    ('Oficina Regional de Relaciones Públicas e Imagen Institucional', NULL),
    ('Oficina Regional de Supervisión y Liquidación de Inversiones Públicas', NULL),
    ('Gerencia Regional de Gestión del Riesgo de Desastres', 'GRGRD'),
    ('Sub Gerencia de Promoción de la Inversión Privada', NULL),
    ('Sub Gerencia de la Juventud', NULL),
    ('Archivo Regional de Moquegua', NULL)
) AS v ("NOMBRE", "SIGLA")
JOIN "UNIDADES_EJECUTORAS" u ON u."CODIGO" = '001'
WHERE NOT EXISTS (SELECT 1 FROM "AREAS" a WHERE a."ID_UNIDAD_EJECUTORA" = u."ID_UNIDAD_EJECUTORA" AND a."NOMBRE" = v."NOMBRE");
