# SIGEA en panelh (Debian 13 + HestiaCP)

Así se publica SIGEA en el servidor del GORE que ya tiene **HestiaCP** con otros sitios. **Sin Docker**:
Node.js y PostgreSQL van instalados en el sistema, SIGEA corre como servicio systemd y Hestia solo pone
el dominio, el proxy y el SSL.

```
Navegador → DNS → IP pública → NAT del GORE (80/443) → nginx de Hestia (IP local de panelh)
   → plantilla de proxy "sigea-3001" → Node (systemd "sigea", 127.0.0.1:3001)
        ├─ API /api/* y web compilada (frontend/dist)
        ├─ PostgreSQL 17 del sistema (127.0.0.1:5432, BD "sigea")
        └─ PDF en /var/lib/sigea/archivos
```

| | Sitios de Hestia (WordPress) | SIGEA |
|---|---|---|
| Ejecuta el código | Apache + PHP-FPM (Hestia) | Node con systemd (`sigea.service`), usuario `sigeaapp` |
| Base de datos | MariaDB (panel) | PostgreSQL propio; no aparece en el panel |
| Archivos | `public_html` | `/opt/sigea` (código) y `/var/lib/sigea/archivos` (PDF) |
| Respaldo de Hestia | Lo cubre | **No lo cubre**: tiene su propio cron (paso 12) |

**No usar en panelh** `docker-compose.yml` ni [despliegue-servidor-linux.md](despliegue-servidor-linux.md): `ufw`,
Docker y su nginx/certbot chocan con el firewall y el nginx de Hestia. Tampoco el puerto 8080 (es el de Apache) ni
editar las plantillas de fábrica de Hestia.

## Requisitos

- Respaldo de los usuarios de Hestia hecho y descargado fuera del servidor.
- Paquetes instalados: `postgresql-17` (Debian) y `nodejs` 22 (repositorio NodeSource), con PostgreSQL escuchando
  solo en `127.0.0.1`/`::1`. Antes de instalar, foto de paquetes (`dpkg-query -W`) para poder volver atrás.
- Dominio definido. TI crea el **registro DNS** apuntando a la **IP pública** (la misma de los otros sitios); el
  NAT de 80/443 hacia panelh ya existe. En Hestia y en este documento la IP es siempre la **local** (`v-list-sys-ips`).
- El código en la rama `servidor-gore` de GitHub, con todo commiteado y subido.

---

# Parte A — En la PC (PowerShell)

## ✏️ Configuración de la PC

```powershell
$IP_PANELH = "<IP_PANELH>"        # ✏️ IP para entrar por SSH a panelh
$CARPETA   = "C:\sigea-deploy"    # ✏️ carpeta donde se descarga el código de GitHub
```

## Paso 0 — Descargar el código de GitHub

Primera vez:

```powershell
git clone -b servidor-gore --single-branch https://github.com/BRAYTON-CHANA/INFORMES-LEGALES.git $CARPETA
cd $CARPETA
git log -1 --oneline
```

Si la carpeta ya existe (actualizaciones). **`reset --hard` borra cambios locales: no editar código ahí**:

```powershell
cd $CARPETA
git fetch origin
git reset --hard origin/servidor-gore
git log -1 --oneline
```

Anotar el commit: es la versión que queda en el servidor.

## Paso 1 — Empaquetar y subir

`git archive` incluye solo lo commiteado (sin `.git`, `node_modules`, `.env`; `.gitattributes` deja fuera
los archivos de Docker):

```powershell
cd $CARPETA
git archive -o $env:TEMP\sigea.tar.gz HEAD
(Get-FileHash $env:TEMP\sigea.tar.gz -Algorithm SHA256).Hash.ToLower()
scp $env:TEMP\sigea.tar.gz "soporte@${IP_PANELH}:/tmp/"
```

---

# Parte B — En panelh (SSH, como root)

```powershell
ssh soporte@$IP_PANELH
```

```bash
sudo -i
```

Los comandos `v-*` de Hestia están en `/usr/local/hestia/bin` (fuera del `PATH` de `sudo`): por eso se usa `$H`.

## ✏️ Configuración del servidor

Todos los datos van en un archivo que solo lee root. Se escribe con `nano` (no pegar claves en la terminal:
quedan en `~/.bash_history`).

```bash
nano /root/sigea-datos.sh
```

Plantilla (valores entre comillas simples, sin espacios junto al `=`, ningún valor con `'`):

```bash
# ===== DOMINIO Y RED =====
DOMINIO='<dominio>'              # ✏️ dominio de SIGEA (el mismo que TI pone en el DNS)
IP='<ip>'                        # ✏️ IP LOCAL de los dominios en Hestia (v-list-sys-ips)

# ===== USUARIO DEL PANEL HESTIA (dueño del dominio) =====
USUARIO_HESTIA='<usuario>'       # ✏️ minúsculas, sin espacios (p. ej. oraj)
HESTIA_PASS='<clave>'            # ✏️ clave para entrar al panel con ese usuario
CORREO='<correo>'                # ✏️ obligatorio en Hestia: avisos de SSL y del panel

# ===== PRIMER USUARIO DE SIGEA (administrador) =====
DNI_ADMIN='<dni>'                # ✏️ DNI del admin (8 dígitos)
ADMIN_PASS='<clave>'             # ✏️ clave inicial (8+); se pide cambiarla al entrar

# ===== AJUSTES DE SIGEA =====
SIGLA_ORAJ='GRM/GGR/ORAJ'
MAX_ARCHIVO_MB='10'              # nginx admite 12 MB: subir los dos juntos

# ===== NO TOCAR =====
H=/usr/local/hestia/bin
```

Ejemplo de los datos no secretos: `DOMINIO='informes.regionmoquegua.gob.pe'`, `IP='<ip local de panelh>'`,
`USUARIO_HESTIA='oraj'`, `CORREO='oraj@regionmoquegua.gob.pe'`, `DNI_ADMIN='<dni real>'`.

Proteger, agregar las claves automáticas (BD y sesiones) y comprobar:

```bash
chmod 600 /root/sigea-datos.sh
echo "PGPASS='$(openssl rand -hex 24)'" >> /root/sigea-datos.sh
echo "JWT='$(openssl rand -hex 64)'" >> /root/sigea-datos.sh
source /root/sigea-datos.sh && echo "Archivo OK"
$H/v-list-sys-ips
echo "Dominio=$DOMINIO | IP=$IP | Usuario=$USUARIO_HESTIA | Correo=$CORREO | DNI=$DNI_ADMIN"
grep -cE '^(HESTIA_PASS|ADMIN_PASS|PGPASS|JWT)=' /root/sigea-datos.sh   # debe dar 4
```

Si se corta el SSH: `sudo -i` y `source /root/sigea-datos.sh` antes de seguir.

| Variable | Paso |
|---|---|
| `PGPASS` | 3 y 4 |
| `JWT`, `DNI_ADMIN`, `ADMIN_PASS`, `SIGLA_ORAJ`, `MAX_ARCHIVO_MB` | 4 |
| `USUARIO_HESTIA`, `HESTIA_PASS`, `CORREO` | 8 |
| `DOMINIO`, `IP` | 9 y 10 |

## Paso 2 — Usuario de servicio, carpetas y código

`sigeaapp` ejecuta SIGEA: sin shell ni SSH. `/opt/sigea` (código) y `/var/lib/sigea` (PDF) en modo 700.

```bash
sha256sum /tmp/sigea.tar.gz      # igual al del paso 1
useradd -r -m -d /opt/sigea -s /usr/sbin/nologin sigeaapp
mkdir -p /var/lib/sigea/archivos
tar -xzf /tmp/sigea.tar.gz -C /opt/sigea
chown -R sigeaapp:sigeaapp /opt/sigea /var/lib/sigea
chmod 700 /opt/sigea /var/lib/sigea
rm /tmp/sigea.tar.gz
ls /opt/sigea
```

## Paso 3 — Base de datos

```bash
source /root/sigea-datos.sh
sudo -u postgres psql -c "CREATE ROLE sigea LOGIN PASSWORD '$PGPASS';" -c "CREATE DATABASE sigea OWNER sigea;"
```

## Paso 4 — `.env`

No poner `SUPABASE_URL` ni `SUPABASE_SECRET_KEY`: si existen, los PDF irían a Supabase y no a la carpeta.
`HOST` no hace falta: por defecto SIGEA escucha solo en `127.0.0.1`.

```bash
source /root/sigea-datos.sh
sudo -u sigeaapp tee /opt/sigea/.env > /dev/null <<EOF
DB_CLIENT=postgres
DATABASE_URL=postgresql://sigea:$PGPASS@127.0.0.1:5432/sigea
DB_SSL=false
PORT=3001
JWT_SECRET=$JWT
JWT_EXPIRES_IN=8h
ADMIN_DNI=$DNI_ADMIN
ADMIN_PASSWORD=$ADMIN_PASS
SIGLA_ORAJ=$SIGLA_ORAJ
MAX_ARCHIVO_MB=$MAX_ARCHIVO_MB
LOGIN_MAX_INTENTOS=5
LOGIN_MINUTOS_BLOQUEO=15
CORS_ORIGIN=
TRUST_PROXY=1
ARCHIVOS_DIR=/var/lib/sigea/archivos
EOF
chmod 600 /opt/sigea/.env
grep -E '^(ADMIN_DNI|SIGLA_ORAJ|MAX_ARCHIVO_MB|ARCHIVOS_DIR)=' /opt/sigea/.env
```

## Paso 5 — Dependencias, build y tablas

Todo como `sigeaapp` con `bash -c "cd … && …"` (un `cd` suelto falla por el modo 700). `--no-audit --no-fund`
evita que `npm ci` se quede colgado.

```bash
sudo -u sigeaapp bash -c "cd /opt/sigea && npm ci --omit=dev --no-audit --no-fund --loglevel=http"
```

```bash
sudo -u sigeaapp bash -c "cd /opt/sigea/frontend && npm ci --include=dev --no-audit --no-fund && npm run build"
ls /opt/sigea/frontend/dist/index.html
```

```bash
sudo -u sigeaapp bash -c "cd /opt/sigea && npm run db:setup && npm run db:migrate"
```

Para traer los datos de la versión de prueba (Supabase) en vez de empezar vacío: restaurar el dump con
`pg_restore --no-owner --role=sigea -d sigea` **en lugar de** `db:setup`, luego `db:migrate`,
`npm run archivos:mudar` y `npm run informes:reindexar`. Ensayarlo antes en la VM.

## Paso 6 — Servicio systemd

```bash
tee /etc/systemd/system/sigea.service > /dev/null <<'EOF'
[Unit]
Description=SIGEA
After=network.target postgresql.service
Wants=postgresql.service

[Service]
User=sigeaapp
WorkingDirectory=/opt/sigea
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable --now sigea
sleep 3; systemctl is-active sigea; curl -s http://127.0.0.1:3001/api/health; echo
```

Debe dar `active` y `"success":true`. Si no: `journalctl -u sigea -n 50 --no-pager`.

## Paso 7 — Plantilla de proxy de Hestia

Nombre propio (`sigea-3001`): las actualizaciones de Hestia no la tocan. `.tpl` = HTTP, `.stpl` = HTTPS.
`client_max_body_size` debe ser mayor que `MAX_ARCHIVO_MB`.

```bash
T=/usr/local/hestia/data/templates/web/nginx
tee $T/sigea-3001.tpl > /dev/null <<'EOF'
server {
    listen      %ip%:%proxy_port%;
    server_name %domain_idn% %alias_idn%;
    error_log   /var/log/%web_system%/domains/%domain%.error.log error;
    include %home%/%user%/conf/web/%domain%/nginx.forcessl.conf*;
    client_max_body_size 12m;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
    include %home%/%user%/conf/web/%domain%/nginx.conf_*;
}
EOF
sed -e 's/listen      %ip%:%proxy_port%;/listen      %ip%:%proxy_ssl_port% ssl;\n    ssl_certificate %ssl_pem%;\n    ssl_certificate_key %ssl_key%;/' -e '/nginx.forcessl.conf/d' $T/sigea-3001.tpl > $T/sigea-3001.stpl
ls $T/sigea-3001.*
```

## Paso 8 — Usuario del panel Hestia

Solo es el dueño del dominio en el panel; no ejecuta SIGEA. El correo es obligatorio.

```bash
source /root/sigea-datos.sh
$H/v-add-user $USUARIO_HESTIA "$HESTIA_PASS" $CORREO
$H/v-list-users | grep $USUARIO_HESTIA
```

## Paso 9 — Dominio conectado a SIGEA

```bash
source /root/sigea-datos.sh
$H/v-add-web-domain $USUARIO_HESTIA $DOMINIO $IP
$H/v-change-web-domain-proxy-tpl $USUARIO_HESTIA $DOMINIO sigea-3001
nginx -t
curl -s -H "Host: $DOMINIO" http://$IP/api/health; echo     # con la IP local, no 127.0.0.1
```

## Paso 10 — HTTPS (Let's Encrypt)

Requiere el DNS público del dominio ya creado (comprobar con `nslookup <dominio>` desde la PC).

```bash
source /root/sigea-datos.sh
$H/v-add-letsencrypt-domain $USUARIO_HESTIA $DOMINIO
$H/v-add-web-domain-ssl-force $USUARIO_HESTIA $DOMINIO
curl -s https://$DOMINIO/api/health; echo
```

## Paso 11 — Primer ingreso y limpieza de claves

1. Abrir `https://<dominio>`, entrar con el DNI y la clave inicial y cambiarla.
2. Guardar `HESTIA_PASS` en un gestor de claves.
3. Borrar las claves del servidor:

```bash
sed -i '/^ADMIN_PASSWORD=/d' /opt/sigea/.env && systemctl restart sigea
sed -i '/^ADMIN_PASS=/d; /^HESTIA_PASS=/d; /^PGPASS=/d; /^JWT=/d' /root/sigea-datos.sh
cat /root/sigea-datos.sh     # ya sin claves
```

4. Crear los abogados en Configuración → Usuarios.

## Paso 12 — Respaldo diario

El respaldo de Hestia no incluye SIGEA. Cada noche (2:30) BD + PDF en `/backup/sigea`, 14 días.

```bash
tee /usr/local/sbin/sigea-respaldo.sh > /dev/null <<'EOF'
#!/bin/sh
set -e
D=/backup/sigea; F=$(date +%F)
mkdir -p "$D" && chmod 700 "$D"
sudo -u postgres pg_dump -Fc sigea > "$D/sigea-$F.dump"
tar -czf "$D/archivos-$F.tar.gz" -C /var/lib/sigea archivos
find "$D" -type f -mtime +14 -delete
EOF
chmod 700 /usr/local/sbin/sigea-respaldo.sh
echo '30 2 * * * root /usr/local/sbin/sigea-respaldo.sh' > /etc/cron.d/sigea-respaldo
/usr/local/sbin/sigea-respaldo.sh && ls -lh /backup/sigea
```

`/backup` está en el mismo disco: sacar copias a otro equipo del GORE.

---

## Comprobaciones

| Prueba | Comando | Esperado |
|---|---|---|
| Servicio | `systemctl is-active sigea` | `active` |
| Salud | `curl -s https://<dominio>/api/health` | `success: true` |
| Puertos solo locales | `ss -tlnp \| grep -E '3001\|5432'` | `127.0.0.1` / `::1` |
| Desde fuera | PC: `Test-NetConnection <IP_PANELH> -Port 3001` | `False` |
| Rebuild de Hestia | `$H/v-rebuild-web-domains <usuario>` | SIGEA sigue respondiendo |
| Firewall | `$H/v-update-firewall` | Igual |
| Reinicio (en ventana) | `reboot` | SIGEA arranca solo |
| Otros sitios | Abrirlos | Sin cambios |

## Actualizar a una versión nueva

1. PC: paso 0 (carpeta existente) y paso 1.
2. panelh, como root (fuera del horario de trabajo):

```bash
/usr/local/sbin/sigea-respaldo.sh
tar --exclude=node_modules -czf /root/sigea-codigo-$(date +%F).tar.gz -C /opt sigea
tar -xzf /tmp/sigea.tar.gz -C /opt/sigea && chown -R sigeaapp:sigeaapp /opt/sigea && rm /tmp/sigea.tar.gz
sudo -u sigeaapp bash -c "cd /opt/sigea && npm ci --omit=dev --no-audit --no-fund && cd frontend && npm ci --include=dev --no-audit --no-fund && npm run build && cd .. && npm run db:migrate"
systemctl restart sigea && sleep 3 && curl -s http://127.0.0.1:3001/api/health; echo
```

El `.env` no se toca. `server.js` solo sirve `frontend/dist` si existe al arrancar: reiniciar siempre tras el build.
Los cambios de tablas van como migración en `database/sql/postgres/migrations/`, nunca a mano en producción.

## Volver atrás

```bash
systemctl stop sigea
tar -xzf /root/sigea-codigo-<FECHA>.tar.gz -C /opt
# Solo si la BD también debe volver (borra la actual):
sudo -u postgres dropdb sigea && sudo -u postgres createdb -O sigea sigea && sudo -u postgres pg_restore --no-owner --role=sigea -d sigea /backup/sigea/sigea-<FECHA>.dump
systemctl start sigea
```

## Cambiar de dominio

SIGEA no guarda el dominio (`CORS_ORIGIN` vacío). Alta del nuevo con los pasos 9–10, probarlo y borrar el viejo
(`$H/v-delete-web-domain`), o dejarlo como alias (`v-add-web-domain-alias`, con SSL para los dos).

## Quitar SIGEA (sin tocar los otros sitios)

```bash
source /root/sigea-datos.sh
$H/v-delete-web-domain $USUARIO_HESTIA $DOMINIO
systemctl disable --now sigea
```

## Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `v-…: orden no encontrada` | `sudo` no ve `/usr/local/hestia/bin` | Usar `$H/v-…` o la ruta completa |
| Permiso denegado / `ERR_MODULE_NOT_FOUND` | `cd` como otro usuario en `/opt/sigea` (700) | `sudo -u sigeaapp bash -c "cd /opt/sigea && …"` |
| `npm ci` colgado | Auditoría y red | `--no-audit --no-fund` |
| 404 en `/` | Falta `frontend/dist` | Build del paso 5.2 y `systemctl restart sigea` |
| 500 en `/api/informes` | BD sin tablas | `db:setup` y `db:migrate` |
| 502 | SIGEA caído | `systemctl status sigea`, `journalctl -u sigea` |
| 413 al subir | PDF mayor que `client_max_body_size` | Subir el límite en la plantilla y `MAX_ARCHIVO_MB` |
| Clave del admin perdida | — | `sudo -u sigeaapp bash -c "cd /opt/sigea && npm run admin:reiniciar-clave -- <DNI>"` |
