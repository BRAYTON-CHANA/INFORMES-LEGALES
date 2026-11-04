-- ============================================
-- 021: oficinas de la Sede Central (UE 001) según el directorio de funcionarios del GORE
-- Moquegua en gob.pe (mismo cambio que seeds/02). Nombres oficiales, 8 oficinas que faltaban
-- y la Oficina de Defensa Nacional se desactiva (sus funciones están en la Gerencia Regional de
-- Gestión del Riesgo de Desastres). Nada se borra.
-- ============================================
DECLARE @sede INT = (SELECT MIN("ID_UNIDAD_EJECUTORA") FROM "UNIDADES_EJECUTORAS" WHERE "CODIGO" = N'001');

UPDATE "AREAS" SET "NOMBRE" = N'Gerencia Regional de Recursos Naturales y Gestión del Medio Ambiente', "SIGLA" = N'GRRNGMA'
WHERE "ID_UNIDAD_EJECUTORA" = @sede AND "NOMBRE" = N'Gerencia Regional de Recursos Naturales y Ambiente';
UPDATE "AREAS" SET "NOMBRE" = N'Sub Gerencia de Gestión Ambiental'
WHERE "ID_UNIDAD_EJECUTORA" = @sede AND "NOMBRE" = N'Sub Gerencia de Gestión Ambiental y Defensa Civil';
UPDATE "AREAS" SET "NOMBRE" = N'Sub Gerencia de Programación Multianual de Inversiones'
WHERE "ID_UNIDAD_EJECUTORA" = @sede AND "NOMBRE" = N'Sub Gerencia Multianual de Inversiones';
UPDATE "AREAS" SET "ACTIVO" = 0
WHERE "ID_UNIDAD_EJECUTORA" = @sede AND "NOMBRE" = N'Oficina Regional de Defensa Nacional, Civil y Seguridad Ciudadana';

INSERT INTO "AREAS" ("ID_UNIDAD_EJECUTORA", "NOMBRE", "SIGLA")
SELECT @sede, v."NOMBRE", v."SIGLA" FROM (VALUES
    (N'Vicegobernación Regional', NULL),
    (N'Oficina Regional de Tecnologías de la Información y Comunicación', N'ORTIC'),
    (N'Oficina Regional de Relaciones Públicas e Imagen Institucional', NULL),
    (N'Oficina Regional de Supervisión y Liquidación de Inversiones Públicas', NULL),
    (N'Gerencia Regional de Gestión del Riesgo de Desastres', N'GRGRD'),
    (N'Sub Gerencia de Promoción de la Inversión Privada', NULL),
    (N'Sub Gerencia de la Juventud', NULL),
    (N'Archivo Regional de Moquegua', NULL)
) AS v ("NOMBRE", "SIGLA")
WHERE @sede IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "AREAS" a WHERE a."ID_UNIDAD_EJECUTORA" = @sede AND a."NOMBRE" = v."NOMBRE");
GO
