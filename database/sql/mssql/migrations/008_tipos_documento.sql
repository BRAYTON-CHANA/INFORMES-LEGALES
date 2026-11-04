-- ============================================
-- 008: más tipos de documento de la ORAJ (mismo cambio que seeds/02_catalogos)
-- ============================================
INSERT INTO "TIPOS_DOCUMENTO" ("NOMBRE", "PREFIJO")
SELECT v."NOMBRE", v."PREFIJO" FROM (VALUES
    (N'Oficio', N'OFICIO'),
    (N'Oficio Múltiple', N'OFICIO MÚLTIPLE'),
    (N'Carta', N'CARTA'),
    (N'Memorando Múltiple', N'MEMORANDO MÚLTIPLE')
) AS v ("NOMBRE", "PREFIJO")
WHERE NOT EXISTS (SELECT 1 FROM "TIPOS_DOCUMENTO" t WHERE t."NOMBRE" = v."NOMBRE");
GO
