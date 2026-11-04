-- ============================================
-- 018: catálogo de unidades ejecutoras (mismo contenido que seeds/02_catalogos)
-- Unidades ejecutoras del pliego 455 Gobierno Regional de Moquegua (13, según la sustentación del
-- presupuesto 2023 ante el Congreso). CODIGO = número de UE; la 001 es la Sede Central (el GORE).
-- La Sede Central que ya existía se completa con su código en vez de duplicarse.
-- ============================================
UPDATE "UNIDADES_EJECUTORAS" SET "CODIGO" = N'001', "NOMBRE" = N'Sede Central del Gobierno Regional'
WHERE "ES_SEDE_CENTRAL" = 1 AND ("CODIGO" IS NULL OR "CODIGO" = N'001');

INSERT INTO "UNIDADES_EJECUTORAS" ("CODIGO", "NOMBRE", "SIGLA", "ES_SEDE_CENTRAL")
SELECT v."CODIGO", v."NOMBRE", v."SIGLA", v."SEDE" FROM (VALUES
    (N'001', N'Sede Central del Gobierno Regional', N'SEDE', 1),
    (N'002', N'Proyecto Especial Regional Pasto Grande', N'PERPG', 0),
    (N'003', N'Sub Región de Desarrollo Ilo', N'SRDI', 0),
    (N'004', N'Sub Región de Desarrollo General Sánchez Cerro', N'SRDGSC', 0),
    (N'100', N'Dirección Regional de Agricultura', N'DRA', 0),
    (N'200', N'Dirección Regional de Transportes y Comunicaciones', N'DRTC', 0),
    (N'300', N'Dirección Regional de Educación', N'DRE', 0),
    (N'301', N'UGEL Ilo', N'UGEL ILO', 0),
    (N'302', N'UGEL Mariscal Nieto', N'UGEL MN', 0),
    (N'303', N'UGEL General Sánchez Cerro', N'UGEL GSC', 0),
    (N'400', N'Dirección Regional de Salud', N'DIRESA', 0),
    (N'401', N'Red de Salud Ilo', N'RED SALUD ILO', 0),
    (N'402', N'Hospital Regional de Moquegua', N'HRM', 0)
) AS v ("CODIGO", "NOMBRE", "SIGLA", "SEDE")
WHERE NOT EXISTS (SELECT 1 FROM "UNIDADES_EJECUTORAS" u WHERE u."CODIGO" = v."CODIGO" OR u."NOMBRE" = v."NOMBRE")
  AND (v."SEDE" = 0 OR NOT EXISTS (SELECT 1 FROM "UNIDADES_EJECUTORAS" u WHERE u."ES_SEDE_CENTRAL" = 1));
