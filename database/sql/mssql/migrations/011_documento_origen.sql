-- ============================================
-- 011: documento de origen — fecha y "emitido de oficio" (mismo cambio que tables/08)
-- Que el origen sea obligatorio (salvo de oficio) lo valida el backend: los informes
-- anteriores pueden no tenerlo y se completan al editarlos.
-- ============================================
IF COL_LENGTH('dbo.INFORMES', 'FECHA_SOLICITUD') IS NULL
    ALTER TABLE "INFORMES" ADD "FECHA_SOLICITUD" DATE NULL;
IF COL_LENGTH('dbo.INFORMES', 'EMITIDO_DE_OFICIO') IS NULL
    ALTER TABLE "INFORMES" ADD "EMITIDO_DE_OFICIO" BIT NOT NULL CONSTRAINT "DF_INFORMES_DE_OFICIO" DEFAULT 0;
GO
