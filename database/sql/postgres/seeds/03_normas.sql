-- ============================================
-- Seed NORMAS: normas de uso frecuente en la ORAJ (editables en Configuración)
-- ============================================
INSERT INTO "NORMAS" ("DENOMINACION", "TIPO", "NUMERO")
VALUES ('Constitución Política del Perú', 'Constitución', '1993'),
       ('TUO de la Ley N° 27444, Ley del Procedimiento Administrativo General (D.S. N° 004-2019-JUS)', 'Ley', '27444'),
       ('Ley N° 27867, Ley Orgánica de Gobiernos Regionales', 'Ley', '27867'),
       ('Ley N° 32069, Ley General de Contrataciones Públicas', 'Ley', '32069'),
       ('Ley N° 30057, Ley del Servicio Civil', 'Ley', '30057'),
       ('Decreto Legislativo N° 1440, del Sistema Nacional de Presupuesto Público', 'Decreto Legislativo', '1440'),
       ('TUO de la Ley N° 27806, Ley de Transparencia y Acceso a la Información Pública (D.S. N° 021-2019-JUS)', 'Ley', '27806')
ON CONFLICT ("DENOMINACION") DO NOTHING;
