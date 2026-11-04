# SIGEA — Gobierno Regional de Moquegua

**Sistema Integrado para la Gestión y Eficiencia Administrativa (SIGEA)**. Su primer
módulo es el de informes legales de la Oficina Regional de Asesoría Jurídica (ORAJ).
Creado a partir de la plantilla *Web Template*: **React 19 + Vite + Tailwind v4** en el
frontend y **Express 5** en el backend, con login JWT, usuarios y roles, catálogos
con validación y base de datos configurable (**SQL Server** o **PostgreSQL**).

**Interfaz**: navbar rojo institucional (logo, nombre del sistema, usuario con su menú
de clave y salida; solo tema claro) con una franja azul y verde de Moquegua; debajo, el menú
lateral con *General*, *Módulos* y *Configuración*. Colores en `frontend/src/index.css`
(`gore-50…900` rojo; `moq-azul`, `moq-verde`).

**Logo**: copiar el PNG a **`frontend/public/logo.png`** (fondo transparente) y recargar
el navegador; no hace falta reiniciar. El ícono de la pestaña es `frontend/public/favicon.png`
(versión cuadrada de 256 px del mismo logo; regenerarlo si cambia el logo).
Otra ruta o URL: `VITE_APP_LOGO` en `frontend/.env.local`. Si no existe, se muestra "GORE".

No depende de ningún proveedor: corre en cualquier servidor con Node.js
(o en Vercel, opcional).

## Módulo de sistematización de informes legales

Herramienta centralizada para **almacenar, sistematizar, buscar y consultar** los
informes legales que emite la ORAJ, en beneficio de las **asesorías legales de las
unidades ejecutoras** del pliego regional.

**La ORAJ** registra cada informe con su estructura: fecha, materia, **normativa
asociada** (norma + artículos), **controversia**, antecedentes, **criterio** y
conclusión. Sube el **PDF oficial** (con versiones) y los **antecedentes**, relaciona
informes (incluido "supera el criterio de") y **publica** los más relevantes.

**Las asesorías de las ejecutoras** entran con **credenciales institucionales**
(su DNI y su clave).
Buscan por texto (también dentro del PDF), materia, norma o año; ven la **ficha
resumen** (imprimible), descargan el PDF oficial y revisan los antecedentes. Solo
ven lo publicado y público, o lo que la ORAJ les compartió.

**Reportes** (ORAJ): uso por unidad ejecutora, informes más consultados, términos
más buscados, búsquedas sin resultados, normas más citadas, y exportación a CSV.

Lo que toman en cuenta las normas:

- Código institucional `INFORME LEGAL N° 001-2026-GRM/GGR/ORAJ` (`SIGLA_ORAJ` en `.env`).
- Clasificación pública / confidencial / reservada (Ley 27806): solo lo público se publica.
- Integridad y trazabilidad (DL 1412, Modelo de Gestión Documental): SHA-256 por
  archivo, versiones que no se sobrescriben y bitácora de cada acción.
- No se elimina nada (Directiva 001-2023-AGN/DDPA): los informes se anulan con motivo.
- Acceso seguro: cuentas creadas por el admin, bloqueo tras 5 intentos fallidos.

Roles: `admin` ve y modifica todo · `abogado` registra informes y modifica los suyos.
Son los únicos que inician sesión: el repositorio es **público** y cualquiera, sin cuenta, busca, ve y
descarga los informes públicos y vigentes (el navbar ofrece «Iniciar sesión»). Cada informe es
**público** (lo ve cualquiera) o **privado** (solo quien lo registró y el admin). En Configuración, el admin
gestiona usuarios, roles y unidades ejecutoras; admin y abogado, los catálogos de
informes (tipos de documento, materias, normas, áreas).

## Requisitos

- Node.js 20+
- SQL Server (Express sirve) **o** PostgreSQL 13+

## Puesta en marcha

```bash
# 1. Dependencias
npm install
cd frontend && npm install && cd ..

# 2. Configuración
cp .env.example .env                       # backend: BD, JWT, admin inicial
cp frontend/.env.example frontend/.env.local   # nombre, descripción y logo de la app

# 3. Base de datos (crea tablas, roles y el usuario admin)
npm run db:setup
# BD que ya existía: npm run db:migrate && npm run informes:reindexar

# 4. Desarrollo (un solo comando: API + web)
npm run dev                  # API :3001 y web http://localhost:5173 (proxy /api → 3001)
# por separado: npm run dev:api / npm run dev:web
```

Entra con `ADMIN_DNI` / `ADMIN_PASSWORD` del `.env`; el sistema pide cambiar la
clave en el primer ingreso.

### Elegir la base de datos

Por defecto **Supabase (PostgreSQL)**: `DB_CLIENT=postgres` y `DATABASE_URL` = la cadena del
*Session pooler* (Supabase → Project Settings → Database → Connect; puerto 5432, IPv4). Con
`DATABASE_URL` se usa SSL siempre y no se crea BD ni usuario (ya existen en Supabase).
Las claves `anon`/`service_role` de Supabase no se usan: el backend habla Postgres directo.

También se puede usar `DB_CLIENT=mssql` o un PostgreSQL propio. Los scripts de cada motor
están en `database/sql/<motor>/` (ver [database/sql/README.md](database/sql/README.md)).

- **SQL Server**: instancia nombrada (`DB_INSTANCE=SQLEXPRESS`, requiere el servicio
  SQL Server Browser) o puerto fijo (`DB_PORT=1433`).
- **PostgreSQL**: `DB_PORT=5432`; `DB_SSL=true` para servicios en la nube.
- Con `DB_ADMIN_USER`/`DB_ADMIN_PASSWORD` (sa / postgres), `db:setup` crea la BD y el
  usuario de la app. Sin ellos, la BD y el usuario deben existir.

## Producción

```bash
cd frontend && npm run build && cd ..
npm start                     # Express sirve la API y frontend/dist en el mismo puerto
# o con PM2:
pm2 start ecosystem.config.cjs
```

Configura `JWT_SECRET` largo y aleatorio. `CORS_ORIGIN` solo si el frontend se sirve
desde otro dominio (su URL exacta; en ese caso, `VITE_API_URL` en el frontend); por
defecto la API responde solo al mismo origen. Sirve detrás de HTTPS (proxy inverso):
el servidor ya envía CSP y demás cabeceras de seguridad, y HSTS cuando llega por HTTPS.
`npm run dev:web` escucha solo en localhost; `VITE_HOST=true` lo abre a la red local.

### Google Cloud Run + Supabase

El `Dockerfile` construye el frontend y deja Express sirviendo API + `frontend/dist` en `PORT`
(Cloud Run usa 8080). Los PDF van a **Supabase Storage** (bucket privado `informes`, lo crea `db:setup`), así que el
disco efímero no importa. Sin `SUPABASE_SECRET_KEY` se guardan dentro de la BD.

```bash
# 1. BD (una sola vez, desde tu PC con DATABASE_URL en .env)
npm run db:setup              # tablas, catálogos, vistas y admin. Luego, solo npm run db:migrate

# 2. Secretos (Secret Manager)
printf '%s' 'postgresql://postgres.<ref>:<clave>@aws-0-<region>.pooler.supabase.com:5432/postgres'   | gcloud secrets create sigea-database-url --data-file=-
openssl rand -hex 48 | tr -d '
' | gcloud secrets create sigea-jwt-secret --data-file=-

# 3. Desplegar (Cloud Build construye el Dockerfile)
gcloud run deploy sigea --source . --region southamerica-west1 --allow-unauthenticated   --set-env-vars DB_CLIENT=postgres,DB_POOL_MAX=5,SIGLA_ORAJ=GRM/GGR/ORAJ,MAX_ARCHIVO_MB=25   --set-env-vars SUPABASE_URL=https://<ref>.supabase.co,SUPABASE_BUCKET=informes   --set-secrets DATABASE_URL=sigea-database-url:latest,JWT_SECRET=sigea-jwt-secret:latest,SUPABASE_SECRET_KEY=sigea-supabase-secret:latest
```

La cuenta de servicio de Cloud Run necesita el rol *Secret Manager Secret Accessor*.
Cloud Run está detrás de un proxy: `trust proxy` (`TRUST_PROXY`, 1) hace que la IP del
límite de login y HSTS salgan de `x-forwarded-*`. Prueba local de la imagen:
`docker build -t sigea . && docker run -p 8080:8080 --env-file .env sigea`.

**Vercel (opcional):** `vercel.json` construye el frontend y publica `api/` como
funciones (los handlers son `(req, res)` compatibles). Necesita una BD accesible desde
internet; no está probado en esta plantilla.

## Estructura

```
server.js                 Express: monta api/ y sirve frontend/dist
api/                      endpoints (execute, health, auth/*, informes/*)
lib/
  database/               DatabaseManager + drivers/ (mssql, postgres)
  handlers/               lógica de los endpoints (auth/, informes/, catalogos.js)
  middleware/auth.js      withAuth / withAdmin (JWT)
  config/credenciales.js  login por DNI, bloqueo y claves temporales
  shared/http.js          cors, método, segmentos de ruta, esAdmin
database/sql/<motor>/     setup/ tables/ seeds/ migrations/
scripts/                  run-sql.js (db:setup), run-sql-migrations.js (db:migrate)
frontend/src/
  app/                    App (rutas), config (marca), navigation (menú)
  app/views/              páginas, con la MISMA jerarquía del menú (carpeta + index.jsx):
    modulos/                /modulos (índice)
      informes/             /modulos/informes · detalle/ · ficha/ · reportes/
    configuracion/          /configuracion (índice)
      usuarios/ roles/ unidades-ejecutoras/ tipos-documento/ materias/ normas/ areas/
  features/               lógica por dominio, sin páginas: informes/ (components, services,
                          utils), catalogos/ (service, hook, CatalogoPagina), layout/, login/
  shared/                 api/, components/ (ui, Toast, DropdownMenu), context/, hooks/, utils/
```

## Cómo extender

- **Página nueva**: carpeta con `index.jsx` en `app/views/<sección>/<página>/` (igual
  que en el menú), su `<Route>` en `app/App.jsx` y su ítem (con `roles` y `desc`) en
  `app/navigation.js`. La ruta queda protegida con los mismos roles del ítem.
- **Módulo nuevo de SIGEA**: `app/views/modulos/<modulo>/`, su lógica en
  `features/<modulo>/` y sus ítems en la sección "Módulos" (aparece solo en `/modulos`).
- **Catálogo administrable**: tabla en `database/sql/<motor>/tables/`, su definición
  (campos, obligatorios, únicos, roles) en `lib/handlers/catalogos.js` y su página en
  `app/views/configuracion/<clave>/` con `CatalogoPagina` (columnas + formulario).
  Sin borrado: se desactiva.
- **Endpoint con reglas propias**: handler en `lib/handlers/`, router en
  `api/<nombre>/[...path].js` y montarlo en `server.js` (ejemplo: `informes`).
- **Cambiar el esquema de una BD con datos**: `database/sql/<motor>/migrations/` +
  `npm run db:migrate`.

Más detalle de convenciones en [AGENTS.md](AGENTS.md).
