-- ============================================
-- Seed NORMAS: normas de uso frecuente en la ORAJ (editables en Configuración)
-- ============================================
INSERT INTO "NORMAS" ("DENOMINACION", "TIPO", "NUMERO")
SELECT v."DENOMINACION", v."TIPO", v."NUMERO" FROM (VALUES
    (N'Constitución Política del Perú', N'Constitución', N'1993'),
    (N'TUO de la Ley N° 27444, Ley del Procedimiento Administrativo General (D.S. N° 004-2019-JUS)', N'Ley', N'27444'),
    (N'Ley N° 27867, Ley Orgánica de Gobiernos Regionales', N'Ley', N'27867'),
    (N'Ley N° 32069, Ley General de Contrataciones Públicas', N'Ley', N'32069'),
    (N'Ley N° 30057, Ley del Servicio Civil', N'Ley', N'30057'),
    (N'Decreto Legislativo N° 1440, del Sistema Nacional de Presupuesto Público', N'Decreto Legislativo', N'1440'),
    (N'TUO de la Ley N° 27806, Ley de Transparencia y Acceso a la Información Pública (D.S. N° 021-2019-JUS)', N'Ley', N'27806')
) AS v ("DENOMINACION", "TIPO", "NUMERO")
WHERE NOT EXISTS (SELECT 1 FROM "NORMAS" n WHERE n."DENOMINACION" = v."DENOMINACION");
GO
