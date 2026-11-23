# Informes Legales ORAJ en el servidor del GORE (Debian 13)

> **⚠️ Solo para un servidor dedicado SIN HestiaCP.** En panelh (Debian 13 + Hestia) **no** seguir esta guía:
> `ufw`, Docker y el nginx/certbot propios chocan con el firewall y el nginx de Hestia y pueden tumbar los demás
> sitios. Para panelh: **[despliegue-hestia.md](despliegue-hestia.md)**.

Guía para instalar Informes Legales ORAJ (repositorio de informes legales de la ORAJ) en un servidor Linux propio del
GORE Moquegua y mudar los datos desde la versión de prueba (Supabase + Google Cloud Run).

Todo corre en el servidor: **la app** (Node.js), **la base de datos** (PostgreSQL 17) y **los PDF**
(carpeta del servidor). Delante va **Nginx** con HTTPS.

```
Internet ──HTTPS──▶ Nginx (443) ──▶ app :8080 (127.0.0.1) ──▶ db PostgreSQL 17 (red interna de Docker)
                                         └──▶ /datos/archivos (PDF, volumen)
```

## 0. Preguntas para el área de TI

Antes de instalar, conviene acordar con TI:

1. **Sistema operativo**: se recomienda **Debian 13 «trixie»** (estable desde el 9-ago-2025; soporte de seguridad
   hasta el 9-ago-2028 y LTS hasta el 30-jun-2030). Trae PostgreSQL 17, la misma versión que la BD de prueba.
2. **¿Se puede usar Docker?** Es la forma recomendada (sección 2). Si no, ver la sección 8.
3. **Recursos mínimos**: 2 vCPU, 4 GB de RAM, 50 GB de disco (los PDF son lo que más crece; prever más).
4. **Dominio y HTTPS**: p. ej. `informes.regionmoquegua.gob.pe`, con certificado del GORE o de Let's Encrypt.
5. **Acceso desde internet**: el repositorio es **público** (cualquiera consulta los informes sin cuenta), así que el
   servidor debe verse desde internet por el puerto 443.
6. **Firewall**: solo 22 (SSH, idealmente restringido), 80 y 443. La base de datos **no** se expone.
7. **Respaldos**: dónde se guardan las copias (otro disco, NAS, otro servidor) y cuántos días se conservan.
8. **Administración**: quién entra al servidor y cómo se suben las actualizaciones.

## 1. Preparar el servidor (Debian 13)

```bash
# Como root: usuario administrador con sudo
adduser oraj && usermod -aG sudo oraj

# Parches de seguridad automáticos
apt update && apt full-upgrade -y
apt install -y unattended-upgrades ufw git curl ca-certificates
dpkg-reconfigure -plow unattended-upgrades

# Firewall: SSH, HTTP y HTTPS
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable

# Zona horaria
timedatectl set-timezone America/Lima
```

Recomendado: entrar por SSH con llave y desactivar el acceso con clave de root
(`PermitRootLogin no`, `PasswordAuthentication no` en `/etc/ssh/sshd_config`).

## 2. Instalar Docker (repositorio oficial de Docker para Debian)

No usar el paquete `docker.io` de Debian: el de Docker trae `docker compose` actualizado.

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker oraj     # volver a entrar para que aplique
docker compose version
```

## 3. Descargar el sistema y configurarlo

```bash
sudo mkdir -p /opt/informes-oraj && sudo chown oraj:oraj /opt/informes-oraj
git clone -b servidor-gore https://github.com/BRAYTON-CHANA/INFORMES-LEGALES.git /opt/informes-oraj
cd /opt/informes-oraj
cp .env.servidor.example .env
chmod 600 .env
nano .env
```

En `.env` completar como mínimo:

| Variable | Cómo |
|---|---|
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` (sin símbolos: va dentro de una URL) |
| `JWT_SECRET` | `openssl rand -hex 64` |
| `ADMIN_DNI` / `ADMIN_PASSWORD` | el admin inicial (solo para una BD nueva; pide cambiar la clave al entrar) |
| `MAX_ARCHIVO_MB` | tamaño máximo por PDF (10 por defecto) |

## 4. Levantar el sistema

```bash
docker compose up -d --build        # construye la app y arranca app + db
docker compose ps                   # los dos en "running" (db en "healthy")
curl -s http://127.0.0.1:8080/api/health
# {"success":true,"status":"ok","database":"postgres","storage":"disco",...}
```

Luego, **una de dos**:

- **BD nueva** (sin datos de la versión de prueba):
  ```bash
  docker compose exec app npm run db:setup     # tablas, catálogos (13 UE, oficinas, tipos, materias, normas) y admin
  ```
- **Traer los datos de la versión de prueba**: sección 6.

## 5. Nginx con HTTPS

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp /opt/informes-oraj/docs/nginx-informes-oraj.conf /etc/nginx/sites-available/informes-oraj
sudo nano /etc/nginx/sites-available/informes-oraj          # poner el dominio real
sudo ln -s /etc/nginx/sites-available/informes-oraj /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d informes.regionmoquegua.gob.pe   # o instalar el certificado del GORE
```

`client_max_body_size` en `nginx-informes-oraj.conf` debe ser mayor que `MAX_ARCHIVO_MB` (viene en 15M para 10 MB).

## 6. Mudanza desde la versión de prueba (Supabase)

Se hace **en una ventana sin uso** (por ejemplo, de noche), porque lo que se registre en la versión de prueba
después del respaldo no se copia.

### 6.1 Base de datos

En Supabase: *Project Settings → Database → Connect →* **Direct connection** (o *Session pooler*). En el servidor:

```bash
cd /opt/informes-oraj
# Respaldo de Supabase (solo el esquema public: tablas, vistas, datos), con pg_dump 17 del contenedor
docker compose exec -T db pg_dump --no-owner --no-privileges --schema=public -Fc \
  "postgresql://postgres.<ref>:<clave>@aws-1-us-west-2.pooler.supabase.com:5432/postgres" > supabase.dump

# Restaurar en la BD del servidor (debe estar vacía: NO correr db:setup antes)
docker compose exec -T db pg_restore --no-owner --no-privileges -U informes_oraj -d informes_oraj < supabase.dump
docker compose exec app npm run db:migrate          # aplica migraciones nuevas, si las hay
```

`pg_restore` puede terminar con «errors ignored on restore»: los avisos `schema "public" already exists` y los
de roles `anon`/`authenticated` (propios de Supabase) son normales. Lo que importa es que estén los datos:

```bash
docker compose exec db psql -U informes_oraj -d informes_oraj -c 'SELECT COUNT(*) FROM "INFORMES";'
```

### 6.2 PDF

Los PDF están en el bucket privado `informes` de Supabase Storage. Se copian a `/datos/archivos` con el
mismo nombre de ruta (la BD no cambia) y se verifica cada uno con su SHA-256:

```bash
docker compose exec \
  -e ORIGEN_SUPABASE_URL=https://<ref>.supabase.co \
  -e ORIGEN_SUPABASE_SECRET_KEY=sb_secret_... \
  app npm run archivos:mudar
# [mudar] N archivo(s): N copiado(s) ..., 0 con error.
```

Se puede correr varias veces: salta los que ya están. No borra nada de Supabase.

### 6.3 Comprobar y cambiar de servidor

1. Entrar a `https://<dominio>`: buscar un informe, abrir su ficha y descargar sus dos PDF.
2. Iniciar sesión como admin y revisar Usuarios y Reportes.
3. Avisar a los usuarios la nueva dirección. Dejar la versión de prueba unos días y luego apagarla
   (Cloud Run: borrar el servicio; Supabase: pausar o borrar el proyecto; quitar las claves).

## 7. Respaldos

Lo que hay que respaldar: **la base de datos** y **la carpeta de PDF**. Ejemplo con cron diario (2 a. m.)
conservando 30 días; copiar `/opt/informes-oraj-respaldos` a otro disco o servidor (lo define TI):

```bash
sudo mkdir -p /opt/informes-oraj-respaldos && sudo chown oraj:oraj /opt/informes-oraj-respaldos
cat > /opt/informes-oraj/respaldo.sh <<'EOF'
#!/bin/sh
set -e
cd /opt/informes-oraj
F=$(date +%F)
docker compose exec -T db pg_dump -U informes_oraj -Fc informes_oraj > /opt/informes-oraj-respaldos/bd-$F.dump
docker run --rm -v informes-oraj_archivos:/datos:ro -v /opt/informes-oraj-respaldos:/r debian:trixie-slim \
  tar czf /r/archivos-$F.tar.gz -C /datos .
find /opt/informes-oraj-respaldos -type f -mtime +30 -delete
EOF
chmod +x /opt/informes-oraj/respaldo.sh
( crontab -l 2>/dev/null; echo "0 2 * * * /opt/informes-oraj/respaldo.sh >> /opt/informes-oraj-respaldos/respaldo.log 2>&1" ) | crontab -
```

Restaurar (servidor nuevo o desastre):

```bash
docker compose up -d db
docker compose exec -T db pg_restore --clean --if-exists -U informes_oraj -d informes_oraj < /opt/informes-oraj-respaldos/bd-AAAA-MM-DD.dump
docker run --rm -v informes-oraj_archivos:/datos -v /opt/informes-oraj-respaldos:/r debian:trixie-slim \
  tar xzf /r/archivos-AAAA-MM-DD.tar.gz -C /datos
docker compose up -d
```

**Probar una restauración** de vez en cuando: un respaldo que nunca se restauró no es un respaldo.

## 8. Sin Docker (si TI no lo permite)

```bash
sudo apt install -y postgresql nginx git           # PostgreSQL 17 de Debian 13
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -   # Node 22 (Debian 13 trae Node 20)
sudo apt install -y nodejs && sudo npm install -g pm2

sudo -u postgres createuser -P informes_oraj && sudo -u postgres createdb -O informes_oraj informes_oraj
sudo mkdir -p /datos/archivos && sudo chown oraj:oraj /datos/archivos

cd /opt/informes-oraj && npm ci --omit=dev && (cd frontend && npm ci && npm run build)
# .env: DATABASE_URL=postgresql://informes_oraj:<clave>@127.0.0.1:5432/informes_oraj, DB_SSL=false, ARCHIVOS_DIR=/datos/archivos, PORT=8080
npm run db:setup
pm2 start server.js --name informes-oraj && pm2 save && pm2 startup systemd
```

Nginx y respaldos igual que arriba (en los respaldos, `pg_dump` y `tar` directos, sin `docker`).

## 9. Actualizar el sistema

```bash
cd /opt/informes-oraj
/opt/informes-oraj/respaldo.sh                     # respaldo antes de actualizar
git pull
docker compose up -d --build
docker compose exec app npm run db:migrate
curl -s http://127.0.0.1:8080/api/health
```

## Problemas frecuentes

| Síntoma | Revisar |
|---|---|
| `storage: "supabase"` en `/api/health` | quedó `SUPABASE_SECRET_KEY` en `.env`: quitarla (compose ya la vacía) |
| Error 413 al subir un PDF | `client_max_body_size` de Nginx menor que `MAX_ARCHIVO_MB` |
| «No se pudo guardar el PDF en el almacenamiento» | permisos o espacio del volumen: `docker compose logs app`, `df -h` |
| La app no arranca | `docker compose logs app` (falta `JWT_SECRET` o la clave de la BD) |
| Login lento o la IP del límite de intentos es la de Nginx | `TRUST_PROXY=1` y las cabeceras `X-Forwarded-*` de `nginx-informes-oraj.conf` |
