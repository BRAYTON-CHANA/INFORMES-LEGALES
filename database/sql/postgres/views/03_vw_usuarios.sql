-- ============================================
-- VW_USUARIOS: cuentas SIN la clave (Configuración → Usuarios). Sin UE: las cuentas son de la ORAJ (025)
-- ============================================
CREATE OR REPLACE VIEW "VW_USUARIOS" AS
SELECT u."ID_USUARIO", u."DNI", u."NOMBRES", u."APELLIDOS", u."EMAIL",
       u."REQUIERE_CAMBIO_PASSWORD", u."INTENTOS_FALLIDOS", u."BLOQUEADO_HASTA", u."ACTIVO",
       u."FECHA_CREACION", u."FECHA_EDICION"
FROM "USUARIOS" u;
