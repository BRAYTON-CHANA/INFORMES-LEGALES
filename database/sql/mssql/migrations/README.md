# Migraciones

Vacía a propósito: el esquema base está en `tables/` (lo crea `npm run db:setup` en
una BD nueva; `db:setup` no ejecuta esta carpeta).

Para cambiar el esquema de una BD que ya tiene datos:

1. Crea aquí `001_descripcion.sql`, `002_...` (orden alfabético), idempotente.
2. Aplica el mismo cambio en el script base correspondiente, para que una
   instalación nueva quede igual (y en la carpeta del otro motor si lo usas).
3. Ejecuta `npm run db:migrate`: aplica solo las que no figuran en
   `SCHEMA_MIGRATIONS`, cada una en su propia transacción.
