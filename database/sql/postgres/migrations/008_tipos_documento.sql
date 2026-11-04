-- ============================================
-- 008: más tipos de documento de la ORAJ (mismo cambio que seeds/02_catalogos)
-- ============================================
INSERT INTO "TIPOS_DOCUMENTO" ("NOMBRE", "PREFIJO")
VALUES ('Oficio', 'OFICIO'),
       ('Oficio Múltiple', 'OFICIO MÚLTIPLE'),
       ('Carta', 'CARTA'),
       ('Memorando Múltiple', 'MEMORANDO MÚLTIPLE')
ON CONFLICT ("NOMBRE") DO NOTHING;
