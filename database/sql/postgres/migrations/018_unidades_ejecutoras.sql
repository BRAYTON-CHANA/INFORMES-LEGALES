-- ============================================
-- 018: catálogo de unidades ejecutoras (mismo contenido que seeds/02_catalogos)
-- Unidades ejecutoras del pliego 455 Gobierno Regional de Moquegua (13, según la sustentación del
-- presupuesto 2023 ante el Congreso). CODIGO = número de UE; la 001 es la Sede Central (el GORE).
-- La Sede Central que ya existía se completa con su código en vez de duplicarse.
-- ============================================
UPDATE "UNIDADES_EJECUTORAS" SET "CODIGO" = '001', "NOMBRE" = 'Sede Central del Gobierno Regional'
WHERE "ES_SEDE_CENTRAL" AND ("CODIGO" IS NULL OR "CODIGO" = '001');

INSERT INTO "UNIDADES_EJECUTORAS" ("CODIGO", "NOMBRE", "SIGLA", "ES_SEDE_CENTRAL")
SELECT v."CODIGO", v."NOMBRE", v."SIGLA", v."SEDE" FROM (VALUES
    ('001', 'Sede Central del Gobierno Regional', 'SEDE', TRUE),
    ('002', 'Proyecto Especial Regional Pasto Grande', 'PERPG', FALSE),
    ('003', 'Sub Región de Desarrollo Ilo', 'SRDI', FALSE),
    ('004', 'Sub Región de Desarrollo General Sánchez Cerro', 'SRDGSC', FALSE),
    ('100', 'Dirección Regional de Agricultura', 'DRA', FALSE),
    ('200', 'Dirección Regional de Transportes y Comunicaciones', 'DRTC', FALSE),
    ('300', 'Dirección Regional de Educación', 'DRE', FALSE),
    ('301', 'UGEL Ilo', 'UGEL ILO', FALSE),
    ('302', 'UGEL Mariscal Nieto', 'UGEL MN', FALSE),
    ('303', 'UGEL General Sánchez Cerro', 'UGEL GSC', FALSE),
    ('400', 'Dirección Regional de Salud', 'DIRESA', FALSE),
    ('401', 'Red de Salud Ilo', 'RED SALUD ILO', FALSE),
    ('402', 'Hospital Regional de Moquegua', 'HRM', FALSE)
) AS v ("CODIGO", "NOMBRE", "SIGLA", "SEDE")
WHERE NOT EXISTS (SELECT 1 FROM "UNIDADES_EJECUTORAS" u WHERE u."CODIGO" = v."CODIGO" OR u."NOMBRE" = v."NOMBRE")
  AND (NOT v."SEDE" OR NOT EXISTS (SELECT 1 FROM "UNIDADES_EJECUTORAS" u WHERE u."ES_SEDE_CENTRAL"));
