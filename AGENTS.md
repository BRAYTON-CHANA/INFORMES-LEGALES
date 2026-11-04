# SIGEA (GORE Moquegua) — Notas del proyecto

SIGEA (Sistema Integrado para la Gestión y Eficiencia Administrativa) del GORE Moquegua;
primer módulo: informes legales de la ORAJ. Creado desde la plantilla Web Template:
backend Express 5 + BD configurable (SQL Server o PostgreSQL) y frontend React 19/Vite 6/
Tailwind v4. Incluye login JWT, usuarios y roles y CRUD genérico de catálogos. Cada
módulo se agrega como feature; `shared/` se mantiene chico. (El calendario de ejemplo
de la plantilla se quitó; migración `006_quitar_eventos`.)

## Estructura

- `server.js` — Express: monta `api/` y sirve `frontend/dist` si existe
- `api/` — endpoints (`execute`, `health`, `auth/[...path]`, `informes/[...path]`)
- `lib/` — `database/` (DatabaseManager + `drivers/`), `handlers/`, `middleware/`,
  `config/credenciales.js`, `shared/http.js`
- `database/sql/<motor>/` — `setup/` (solo mssql) → `tables/` → `seeds/` → `views/` →
  `triggers/` → `procedures/` → `indexes/`; `migrations/` aparte (`db:migrate`)
- `frontend/src/` — `app/` (App, config, navigation, **views**) · `features/` (lógica por
  dominio, sin páginas) · `shared/` (api, components, context, hooks, utils)
- **`app/views/` sigue la jerarquía del menú**: una carpeta con `index.jsx` por sección y
  por página (`modulos/informes/{ficha,formulario,reportes}/`,
  `configuracion/<clave>/`). No hay página de inicio: `/` redirige a la lista de informes. Página nueva = carpeta aquí + `<Route>` + ítem del menú.
  Las páginas importan de `@/features/...`; las features no importan páginas

## Base de datos

- **Servidor del GORE (rama `servidor-gore`)**: Debian 13, `docker-compose.yml` (app `node:22-trixie-slim` + `postgres:17-trixie`
  sin puerto publicado), PDF en carpeta (`ARCHIVOS_DIR` → `STORAGE='disco'`), `DB_SSL=false` con `DATABASE_URL`, Nginx
  (`docs/nginx-sigea.conf`). Guía: `docs/despliegue-servidor-linux.md`. Mudanza de PDF: `npm run archivos:mudar`.
  `lib/storage/archivos.js`: prioridad `supabase` (secret key) > `disco` (`ARCHIVOS_DIR`) > `bd`; misma `RUTA_ARCHIVO` en los dos.
- **Prueba en línea (rama `main`): Supabase (PostgreSQL) + Google Cloud Run** (`Dockerfile`; ver README). Con `DATABASE_URL`
  (Session pooler, IPv4) el driver pg usa SSL y `DB_POOL_MAX` (5); `db:setup` no crea BD/usuario.
  `server.js` pone `trust proxy` y `clientIp` usa `req.ip`. SQL Server sigue como opción.
- Motor por `.env`: `DB_CLIENT=postgres|mssql` (por defecto postgres). `DatabaseManager` tiene la misma API
  para ambos; lo específico (conexión, placeholders, `OUTPUT`/`RETURNING`, paginado,
  procedimientos) está en `lib/database/drivers/<motor>.js` (`dialect`).
- **SQL portable** (obligatorio en handlers y frontend):
  - Tablas y columnas en MAYÚSCULAS snake_case **entre comillas**: `"USUARIOS"`, `"ID_USUARIO"`
  - Literales siempre como parámetro: `"ACTIVO" = ?` con `true` (nunca `= 1` ni `= TRUE`)
  - Placeholders `?` (secuencial) o `$n`. Nada de `@nombre`, `TOP`, `LIMIT`, `ISNULL`,
    `GETDATE()`/`NOW()` en SQL compartido: usar `selectWithLimit`/`selectPaginated`,
    `COALESCE`, y pasar `new Date()` como parámetro
  - Preferir los métodos CRUD (`select`, `insert`, `update`, `count`…) al SQL crudo
  - Sin subconsultas correlacionadas ni `STRING_AGG` cuando se pueda evitar (unir en JS)
- **Vistas para las lecturas con JOIN** (`database/sql/<motor>/views/`, en los dos motores; migración
  `020_vistas`): el código **lee la vista** con los métodos CRUD (`select`, `selectPaginated`…) y **escribe en
  la tabla**. Hoy: `VW_INFORMES` (informe + tipo, materia, UE, área, `PROCEDENCIA`, `REGISTRADO_POR`,
  `PUBLICADO_POR`; conserva las columnas de `INFORMES` menos `TEXTO_DOCUMENTO`, así los filtros son los mismos),
  `VW_AREAS` (área + su UE) y `VW_USUARIOS` (usuario **sin** `PASSWORD_HASH`). Columna nueva en una tabla
  → agregarla también a su vista (columnas explícitas, sin `*`). En el catálogo, `vista:` indica de dónde se lista.
- Transacciones: `DatabaseManager.transaction(async (tx) => { await tx.run(sql, [..]) })`
- Scripts: una tabla por archivo, numerados, idempotentes, **en los dos motores**
  (o borrar la carpeta del que no se use). Equivalencias en `database/sql/README.md`.
- **Integridad en la BD, no solo en JS** (migración `010_integridad`): CHECKs de dominio (número, año,
  anulado ⇒ motivo, publicado ⇒ fecha, área ⇒ UE), índices únicos filtrados (un archivo
  principal OFICIAL/SOLICITUD por informe), índices en las FK consultadas y **sin `ON DELETE CASCADE`**
  en tablas del repositorio (un DELETE suelto falla; eliminar un informe borra sus hijas a propósito en
  `eliminar()`). Regla nueva = su CHECK/índice en `tables/` y
  una migración que primero corrija los datos existentes.
- `/api/execute` no escribe en `INFORMES`, `INFORME_*` ni catálogos (ni el admin): van por su endpoint.
- `insert`/`update` devuelven las filas. En SQL Server, tablas con trigger no admiten
  `OUTPUT INSERTED` sin `INTO`: el driver ya hace fallback (`SCOPE_IDENTITY()` /
  UPDATE+SELECT); no usar `OUTPUT INSERTED` directo en código nuevo.
- Vistas con `*` en SQL Server fijan sus columnas al crearse: `db:setup` corre
  `sp_refreshview`; si se agregan columnas a mano, refrescar las vistas.

## Backend

- Node.js **ESM** (`type: "module"`); handlers con firma `(req, res)` estilo Vercel
- Respuesta estándar: `{ success, data?, message? }`
- Helpers de `lib/shared/http.js`: `cors(req,res)` (true = preflight respondido; solo
  emite CORS para los orígenes de `CORS_ORIGIN`, `*` se ignora), `soloMetodo(req,res,'POST')`,
  `parseSegments(req)`, `esAdmin(user)`, `clientIp(req)`, **`error500(res, tag, err)`**
  (en todo `catch`: 4xx con `err.status` pasa; 500 responde "Error interno" y el detalle va
  solo al log — nunca devolver `error.message` de la BD)
- Auth: JWT Bearer. `withAuth(handler)` **revalida contra la BD** (caché `AUTH_CACHE_SEG`,
  60 s): usuario inactivo → 401; los roles de `req.user` son los
  actuales; con `REQUIERE_CAMBIO_PASSWORD` → 403 `code: 'CAMBIO_PASSWORD'` salvo
  `withAuth(h, { permitirCambioPendiente: true })`. Tras cambiar cuentas/roles llamar
  `olvidarUsuario(id?)`. `withAdmin(handler)` exige rol `admin`.
  Claves bcrypt, mínimo 8 caracteres (`validarPassword` en `cambiar-password.js`)
- Login: mensaje genérico ante clave incorrecta (también si la cuenta está bloqueada) y
  límite por IP (`LOGIN_MAX_POR_IP_MINUTO`, 20)
- `server.js` pone las cabeceras de seguridad (CSP, X-Frame-Options, nosniff, Referrer-Policy,
  `Cache-Control: no-store` en `/api`). Si se agrega un CDN o fuente externa, sumarlo a la CSP
- `/api/auth/*`: `login` (`{ dni, password }`), `verify`, `cambiar-password` (la propia y
  **solo con `REQUIERE_CAMBIO_PASSWORD`**: cuenta nueva o clave reiniciada; si no, 403), `register` (solo admin: no
  recibe clave, la genera `claveTemporal()` y la devuelve una vez; los usuarios
  no tienen UE: son de la ORAJ, migración `025_quitar_ue_usuarios`) y
  `reset-password-admin` (solo admin, menú "…" de Usuarios: clave al azar de `claveTemporal()` que se muestra una
  vez y obliga a cambiarla). Si el admin pierde su clave: `npm run admin:reiniciar-clave -- <DNI>`
- `/api/execute` (CRUD genérico): **solo admin** (`withAdmin`; lo usan Usuarios y Roles), solo métodos CRUD
  sobre tablas y vistas (**sin SQL libre**: `query`, `rawSelect`, procedimientos bloqueados). Los abogados
  no lo usan. Lo que necesite JOINs va en una vista. Lo que tenga reglas (solo lo
  suyo, validaciones) va en un endpoint propio — modelo: `lib/handlers/informes/`
- Express 5: con `app.use('/api/x', handler)`, dentro del handler `req.url` ya viene
  sin el prefijo; `parseSegments` cubre Express y Vercel

## Frontend

- Alias `@` → `frontend/src`
- Llamadas a la API solo por `apiFetch` (`shared/api/apiFetch.js`): agrega el JWT,
  parsea `{success,data,message}`, 401 con sesión → limpia y recarga (en páginas públicas sigue como visitante). `db` (`shared/api/db.js`) = CRUD
  genérico vía `/api/execute`
- Sesión: `useAuthContext()` → `{ user, roles, isAdmin, isAuthenticated, login,
  logout, patchUser }`. Rutas con `<ProtectedRoute soloAdmin? roles?>`
- Layout (`features/layout/AppLayout.jsx`): navbar `bg-gore-600` (logo, SIGEA, usuario
  con `DropdownMenu` de clave/salir) + `FranjaMoquegua` (azul/verde) y debajo el
  menú lateral. Menú: `app/navigation.js` = **única fuente** de secciones (`to` = su
  página índice), ítems (`roles`, `desc`, `sub`): de ahí salen el sidebar, las páginas
  índice (`features/layout/SeccionIndice`) y los roles de cada
  `<Route>` (`rolesDe(to)`). Rutas de informes en `features/informes/utils/rutas.js`
  (no escribir `'/modulos/informes/...'` a mano). Marca: `app/config.js` (`VITE_APP_NAME`,
  `VITE_APP_FULL_NAME`, `VITE_APP_DESCRIPTION`, `VITE_APP_LOGO`, por defecto
  `/logo.png` en `frontend/public`; si falla, "GORE"). Ícono de pestaña: `public/favicon.png`
  (logo cuadrado 256 px)
- Colores institucionales (tokens en `@theme` de `index.css`): **rojo `gore-50…900`**
  (principal: botones, activo, navbar) y blanco; secundarios **`moq-azul`** (enlaces,
  códigos, destacados) y **`moq-verde`**. No usar `blue-*` para acciones
- UI compartida en `shared/components/ui.jsx`: `Button`, `Card`, `Modal`, `Field`,
  `Input`, `Select`, `Textarea`, `Badge`, `Table`/`Tr`/`Td`, `IconButton`,
  `PageHeader`, `ErrorAlert`, `EmptyState`, `Spinner`, `Paginacion`;
  avisos con `useToast()` + `<Toast />`; `DropdownMenu`, `Portal`
- **Solo tema claro**: no hay modo oscuro ni selector de tema. No usar `dark:` (el
  variante está desactivado en `index.css` para que no siga al modo oscuro del sistema)
- Catálogos (UE, tipos de documento, materias, normas, áreas): `/api/catalogos/:clave`
  (`lib/handlers/catalogos.js`: campos, obligatorios, únicos sin mayúsculas/tildes → 409,
  `roles` = quién lo ve; crear, editar, desactivar y ver inactivos: **solo admin** (los abogados, en modo lectura), `unicosPor`, `vista`; sin DELETE, se desactiva). Front: `features/catalogos/`
  (`catalogosService`, `useCatalogo`, `CatalogoPagina`); cada página declara columnas y formulario en JSX.
  No usar `/api/execute` para catálogos. Usuarios y Roles siguen con `db`/`auth` (solo admin; Usuarios lee `VW_USUARIOS`)
- Menú Configuración: **Acceso** (Usuarios, Roles: admin) · **Organización** (Unidades ejecutoras: una sola
  página con cada UE desplegable y sus oficinas; solo el admin cambia UE y oficinas; los abogados las ven) ·
  **Informes** (Tipos de documento, Materias, Normas). `/configuracion/areas` redirige a la de UE
- `shared/` solo para lo usado por 2+ features; lo demás vive en su feature

## Repositorio de informes (feature principal)

Módulo de sistematización de los informes que **emite la ORAJ** para que los
**consulten las asesorías legales de las unidades ejecutoras** del pliego.

- Backend `lib/handlers/informes/`, montado en `/api/informes`:
  `index.js` (rutas), `permisos.js` (quién ve/edita), `archivos.js` (subida/descarga),
  `vinculos.js` (normativa asociada), `indice.js` (TEXTO_BUSQUEDA),
  `texto.js` (texto del PDF/DOCX), `reportes.js`. Páginas en `app/views/modulos/informes/`
  (`index` = lista, `formulario` = registrar/editar en página propia
  (`rutas.nuevo`, `rutas.editar(id)`; sin modal), `ficha` = **única página del informe** (`rutas.ficha(id)`: se imprime; quien puede editar ve además acciones, versiones y bitácora), `reportes`); lógica en
  `features/informes/` (components, services, utils).
- Cada informe sigue su cabecera: **1. Documento de origen** (la «Referencia»: `ID_TIPO_SOLICITUD`,
  `NUMERO_SOLICITUD`, `FECHA_SOLICITUD`, procedencia `ID_UE_SOLICITANTE` (obligatoria) + `ID_AREA` (oficina de esa UE, opcional; lo
  comprueba `prepararGuardado`), `EXPEDIENTE`
  SGD, PDF en categoría SOLICITUD, `NOMBRE_ADMINISTRADO` opcional = la persona o empresa cuyo caso se atiende) y **2. Informe emitido** (`ID_TIPO_DOCUMENTO`, código, PDF OFICIAL).
  La lista muestra Informe legal · Institución · Asunto · Fecha · Oficio · Administrado (Estado solo admin/abogado);
  el código y el oficio abren su PDF (`listar()` devuelve `PDF_OFICIAL` / `PDF_ORIGEN`).
  El origen es obligatorio salvo `EMITIDO_DE_OFICIO` (lo valida `validarOrigen` en el backend; los
  informes anteriores sin origen se completan al editarlos). `TIPOS_DOCUMENTO` es un solo catálogo: `USO_SOLICITUD`/`USO_RESPUESTA` dicen en qué lista
  aparece y `ORDEN_SOLICITUD`/`ORDEN` su posición (más común primero); `/api/informes/catalogos` devuelve
  `tiposSolicitud` y `tiposRespuesta` ya ordenados.
- Tablas: `INFORMES` (+ resumen, controversia, antecedentes, criterio, conclusión, publicación,
  texto del PDF; para publicar exige PDF oficial, fecha, materia, resumen y ≥1 norma), `INFORME_ARCHIVOS` (binario en **Supabase Storage**, bucket privado `SUPABASE_BUCKET`, ruta en `RUTA_ARCHIVO`; sin
  `SUPABASE_SECRET_KEY`, en `CONTENIDO` — todo en `lib/storage/archivos.js`, migración `026_archivos_storage`; las descargas
  pasan siempre por el backend; `CATEGORIA` OFICIAL = respuesta y
  SOLICITUD = documento de origen con todos sus anexos en un solo PDF; solo PDF, versionados; SHA-256;
  los anexos sueltos se quitaron en la migración `013_quitar_anexos`), `INFORME_NORMAS` (guarda el **texto** de la norma, `NORMA`, + artículos; el catálogo `NORMAS` solo
  sugiere al escribir y lo escrito a mano no se agrega a él — migración `015_normas_texto`), `INFORME_AUDITORIA`, `INFORME_BUSQUEDAS`;
  catálogos `UNIDADES_EJECUTORAS` (13 del pliego 455; `CODIGO` = número de UE, la 001 es la Sede Central —
  ya no hay `ES_SEDE_CENTRAL`), `AREAS` (oficinas **de cada UE**: `ID_UNIDAD_EJECUTORA`, nombre único por UE —
  migración `019_areas_por_ue`), `TIPOS_DOCUMENTO`, `MATERIAS`, `NORMAS`.
- Código `"<PREFIJO> N° 001-2026-<SIGLA_ORAJ>"`; `NUMERO`+`ANIO` únicos por tipo.
- Estado visible: **Vigente / No vigente** (`ESTADO` = `VIGENTE` | `ANULADO`; "Marcar como no vigente"
  pide motivo, en la ficha); cada PDF nuevo es otra versión. **Eliminar** (`DELETE /api/informes/:id`,
  en la lista y en la ficha) borra de verdad el informe con sus archivos, normas y bitácora.
- **Quién ve / edita se decide solo en `permisos.js`**. Roles: solo `admin` y `abogado` (registra): son
  los únicos que inician sesión. `asesor_ejecutora` se quitó en `012_roles`, el `usuario` de la plantilla en
  `023_quitar_rol_usuario` y `consulta` en `024_repositorio_publico`.
- **Repositorio público**: `/api/informes` va con `withAuthOpcional` (sin `Authorization` → `req.user = null`;
  con token se valida igual que `withAuth`). Sin sesión solo `GET` de lista, `catalogos`, ficha y descarga
  (el resto → 401, en `handler()` de `informes/index.js`); `filtrosVisibilidad(null)` = `FILTROS_PUBLICO`.
  Bitácora y búsquedas guardan `ID_USUARIO` null para el visitante (reportes: fila «Público (sin sesión)»).
  Front: `AppLayout` no exige sesión; `/` redirige a la lista de informes (para todos); navbar con «Iniciar sesión»;
  registrar/editar/reportes/configuración con `ProtectedRoute roles={admin,abogado}`. `/api/catalogos` sigue con `withAuth`.
  Cada informe es **público** (`PUBLICADO = true`: lo ve cualquiera, sin sesión, si está vigente)
  o **privado** (solo quien lo registró —`ID_USUARIO_REGISTRO`— y el admin). Editar, eliminar, subir
  archivos, anular y cambiar público/privado: solo quien lo registró y el admin. Para ser público
  exige PDF firmado, fecha, materia, resumen y ≥1 norma (`publicar()`). Reportes: admin y abogado.
- La migración `014_quitar_sin_uso` borró abogado a cargo, clasificación, criterio superado
  (`VIGENCIA_CRITERIO`, `ID_SUPERADO_POR`, `NOTA_VIGENCIA`) y las tablas `INFORME_PERMISOS` e `INFORME_RELACIONES`.
- Los dos PDF (documento de origen con sus anexos y el informe firmado) se suben desde el formulario;
  la ficha solo muestra, con versiones y bitácora.
- Credenciales: `lib/config/credenciales.js`. **Se entra solo con el DNI** (8 dígitos, `USUARIOS.DNI`
  obligatorio y único; no hay usuario personalizado — migración `017_login_dni`; el email es solo de contacto);
  admin inicial `ADMIN_DNI`/`ADMIN_PASSWORD`; bloqueo tras `LOGIN_MAX_INTENTOS`. Reportes sin uso por UE (no hay
  cuentas fuera de la ORAJ; el público entra sin cuenta).
- Búsqueda libre: un `like` por palabra sobre `TEXTO_BUSQUEDA` (mayúsculas sin tildes;
  incluye el texto del PDF oficial y el de las normas; el filtro «Normativa» es texto libre: informes con una norma asociada, `INFORME_NORMAS.NORMA` + `ARTICULOS`,
  que contenga todas las palabras, sin mayúsculas ni tildes). Tras cambiar el
  índice: `npm run informes:reindexar`.
- `buildWhere` acepta `{ or: [filtrosA, filtrosB] }` dentro del array de filtros.

## Comandos

```bash
npm run dev               # backend :3001 (node --watch) + frontend :5173 juntos
npm run dev:api           # solo backend · npm run dev:web solo frontend
npm start                 # producción (sirve frontend/dist si existe)
npm run db:setup          # crea BD (si hay DB_ADMIN_*), tablas, seeds y admin
npm run db:migrate        # aplica database/sql/<motor>/migrations pendientes
npm run informes:reindexar  # re-extrae texto de los PDF y recalcula TEXTO_BUSQUEDA
npm run archivos:mudar      # copia los PDF (Supabase Storage o BD) a ARCHIVOS_DIR, verificando SHA-256
docker compose up -d --build  # servidor del GORE: app + PostgreSQL (docs/despliegue-servidor-linux.md)
npm run admin:reiniciar-clave -- <DNI>  # clave temporal para una cuenta (p. ej. el admin)
cd frontend && npm run build   # build de producción
cd frontend && npm run lint    # ESLint (React, hooks, accesibilidad jsx-a11y); dejarlo limpio
```
