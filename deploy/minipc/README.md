# Migracion al Mini PC

Este directorio contiene utilidades para trabajar desde tu equipo actual y publicar cambios hacia el Mini PC en red.

## Enfoque recomendado

- usar `Proxmox` en el Mini PC como base
- desplegar la app dentro de un `LXC` o `VM` Linux dedicado
- acceder por `SSH` directamente al guest de aplicacion
- sincronizar el codigo desde este equipo con `rsync`

## Flujo recomendado

1. crear o preparar el `LXC/VM` de aplicacion en el Mini PC
2. asegurar acceso `SSH` al guest
3. copiar el proyecto con `deploy/minipc/deploy-via-ssh.sh`
4. instalar dependencias y compilar en remoto
5. arrancar el servidor en remoto

## Estado actual del despliegue

El Mini PC operativo queda configurado con:

- host objetivo:
  - `192.168.0.100`
- ruta de app:
  - `/opt/trazabilidad`
- clave SSH dedicada:
  - `$HOME/.ssh/trazabilidad_minipc_ed25519`
- servicio app:
  - `trazabilidad.service`
- servicio broker MQTT:
  - `mosquitto.service`

## Script principal

`deploy/minipc/deploy-via-ssh.sh`

Wrapper ya configurado para tu Mini PC actual:

- `deploy/minipc/deploy-current.sh`
- `deploy/minipc/check-current.sh`

Sincroniza el repo al host remoto y ejecuta, si se desea:

- `npm install`
- `npm run build`

## Variables soportadas

- `TARGET_HOST` host o IP del guest
- `TARGET_USER` usuario SSH remoto
- `TARGET_PATH` ruta remota de despliegue
- `RUN_INSTALL` `1` o `0`
- `RUN_BUILD` `1` o `0`
- `RESTART_SERVICE` `1` o `0`
- `SERVICE_NAME` nombre del servicio systemd remoto
- `SSH_PORT` puerto SSH
- `SSH_IDENTITY` ruta a clave SSH dedicada

## Ejemplo

```bash
TARGET_HOST=192.168.1.80 \
TARGET_USER=root \
TARGET_PATH=/opt/trazabilidad \
SSH_IDENTITY=$HOME/.ssh/trazabilidad_minipc_ed25519 \
RUN_INSTALL=1 \
RUN_BUILD=1 \
bash deploy/minipc/deploy-via-ssh.sh
```

## Configuracion para tu Mini PC actual

Puedes partir de estos valores:

```bash
TARGET_HOST=192.168.0.100
TARGET_USER=root
TARGET_PATH=/opt/trazabilidad
SSH_IDENTITY=$HOME/.ssh/trazabilidad_minipc_ed25519
```

Tambien puedes copiar `deploy/minipc/.env.example` a un fichero local no versionado y cargarlo antes del despliegue.

## Exclusiones de sincronizacion

El script no copia:

- `.git/`
- `node_modules/`
- `dist/`
- `local_mirror/`
- `local_iot/`
- `credenciales.json`

Las credenciales y datos locales deben gestionarse en el host remoto.

## Recomendacion operativa

- mantener el codigo en este equipo como fuente principal
- desplegar al Mini PC en iteraciones pequenas
- no copiar datos de runtime locales al entorno remoto salvo que lo decidas explicitamente

## Si trabajas con contraseña SSH

Si todavia no usas clave SSH, puedes sincronizar manualmente y escribir la contrasena cuando se te solicite:

```bash
rsync -az --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'dist/' \
  --exclude 'local_mirror/' \
  --exclude 'local_iot/' \
  --exclude 'credenciales.json' \
  ./ root@192.168.0.100:/opt/trazabilidad/
```

Despues, en el host remoto:

```bash
cd /opt/trazabilidad
npm install
npm run build
npm run server
```

Ver `deploy/minipc/remote-post-deploy.md` para los pasos posteriores.

## Flujo de trabajo continuo desde este equipo

Cada vez que quieras publicar cambios al Mini PC:

```bash
bash deploy/minipc/deploy-current.sh
```

Esto sincroniza el repo a `root@192.168.0.100:/opt/trazabilidad`, instala dependencias si cambian, recompila el frontend y reinicia `trazabilidad.service`.

## Comando único de comprobación

Para ver estado del servicio, últimos logs y `health`/`iot health`:

```bash
bash deploy/minipc/check-current.sh
```

Esto muestra:

- estado de `trazabilidad.service`
- ultimos logs del servicio
- `GET /api/health`
- `GET /api/iot/health`

## Servicio systemd recomendado

El repositorio incluye un servicio listo en:

- `deploy/minipc/trazabilidad.service`

Instalacion remota recomendada:

```bash
scp -i "$HOME/.ssh/trazabilidad_minipc_ed25519" \
  deploy/minipc/trazabilidad.service \
  root@192.168.0.100:/etc/systemd/system/trazabilidad.service

ssh -i "$HOME/.ssh/trazabilidad_minipc_ed25519" root@192.168.0.100 \
  "systemctl daemon-reload && systemctl enable --now trazabilidad.service"
```

## Operacion remota diaria

Estado del backend:

```bash
ssh -i "$HOME/.ssh/trazabilidad_minipc_ed25519" root@192.168.0.100 \
  "systemctl status trazabilidad.service"
```

Estado del broker MQTT:

```bash
ssh -i "$HOME/.ssh/trazabilidad_minipc_ed25519" root@192.168.0.100 \
  "systemctl status mosquitto"
```

Logs del backend:

```bash
ssh -i "$HOME/.ssh/trazabilidad_minipc_ed25519" root@192.168.0.100 \
  "journalctl -u trazabilidad.service -n 100 --no-pager"
```

Prueba MQTT local en el Mini PC:

```bash
ssh -i "$HOME/.ssh/trazabilidad_minipc_ed25519" root@192.168.0.100 \
  "mosquitto_pub -h 127.0.0.1 -t trazabilidad/iot/sala/floracion -m '{\"deviceId\":\"esp32-flor-01\",\"timestamp\":\"2026-03-21T20:50:00.000Z\",\"metrics\":{\"t\":25.2,\"h\":63.4,\"vpd\":0.91,\"dli\":30.8,\"substrate_t\":21.2,\"ec\":2.0,\"ph\":6.1}}'"
```
