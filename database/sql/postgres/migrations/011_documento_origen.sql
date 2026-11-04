-- ============================================
-- 011: documento de origen — fecha y "emitido de oficio" (mismo cambio que tables/08)
-- Que el origen sea obligatorio (salvo de oficio) lo valida el backend: los informes
-- anteriores pueden no tenerlo y se completan al editarlos.
-- ============================================
ALTER TABLE "INFORMES" ADD COLUMN IF NOT EXISTS "FECHA_SOLICITUD" DATE NULL;
ALTER TABLE "INFORMES" ADD COLUMN IF NOT EXISTS "EMITIDO_DE_OFICIO" BOOLEAN NOT NULL DEFAULT FALSE;
