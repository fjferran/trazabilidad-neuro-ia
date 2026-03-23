# Guia de Instalacion

## 1. Objetivo

Esta guia explica como instalar y arrancar la app de trazabilidad desde cero en una maquina nueva, incluyendo la capa IoT local con `SQLite` y despliegue edge sobre `Mini PC + Proxmox` o `Raspberry Pi 5`.

## 2. Requisitos previos

- macOS, Linux o Windows con Node.js 18+
- acceso al repositorio del proyecto
- fichero `credenciales.json` de Google Cloud
- acceso de la cuenta de servicio a la hoja de Google Sheets
- impresora de etiquetas opcional para el modulo QR
- espacio local para `local_mirror/` y `local_iot/`

Para despliegue edge estable se recomienda:

- `Mini PC` con `Proxmox`
- `16 GB RAM` minimo
- `NVMe 512 GB` minimo
- red LAN cableada
- `UPS`

## 3. Estructura minima esperada

El proyecto debe contener al menos:

- `src/App.jsx`
- `server/server.js`
- `server/iot.js`
- `server/actuators.js`
- `server/actuators.json`
- `package.json`
- `vite.config.js`
- `credenciales.json`

## 4. Preparacion de Google Sheets

La hoja maestra debe tener estas pestañas:

- `Sheet_Genetica`
- `Sheet_Madres`
- `Sheet_Clones`
- `Sheet_Lotes`
- `Sheet_Floracion`
- `Sheet_Cosecha`
- `Sheet_Extraccion`

Estructura recomendada de `Sheet_Extraccion`:

- `ID Extracción`
- `ID Origen`
- `Fecha Extracción`
- `Peso Extracto (g)`
- `Laboratorio`
- `Estado`
- `Notas`

Debe compartirse con la cuenta de servicio usada por `credenciales.json`.

## 5. Instalacion de dependencias

```bash
npm install
```

La instalacion crea tambien la dependencia nativa `better-sqlite3` usada por la base IoT local.

Tambien instala dependencias del sistema RAG local del asistente:

- `pdf-parse`
- `openai`

## 6. Arranque en desarrollo

Terminal 1:

```bash
npm run server
```

Terminal 2:

```bash
npm run dev
```

Frontend:

- `http://localhost:5001`

Backend:

- `http://localhost:3001`

## 7. Arranque integrado en local

```bash
npm run build
node server/server.js
```

En este modo, el backend sirve tambien el frontend compilado desde `dist`.

URL:

- `http://localhost:3001`

## 7.1 Arranque en Mini PC

En despliegue estable sobre `Mini PC + Proxmox`, la ejecucion recomendada es mediante `systemd`.

Servicios esperados:

- `trazabilidad.service`
- `mosquitto.service`

Broker MQTT autenticado esperado:

- host: `192.168.0.100`
- puerto: `1883`
- usuario: `javier`
- password: configurada en el Mini PC y no versionada en el repositorio

Comandos:

```bash
systemctl status trazabilidad.service
systemctl restart trazabilidad.service
systemctl status mosquitto
systemctl restart mosquitto
```

URL esperada de acceso en red local:

- `http://192.168.0.100:3001`

## 8. Primera comprobacion

Verificar:

1. la app abre
2. aparece la pantalla de seleccion de usuario local
3. el dashboard carga
4. el sidebar muestra estado `Conectado`
5. `Google Sheets activo`
6. el espejo local se inicializa
7. la base IoT local se crea sin error

Usuarios locales iniciales esperados:

- `Operario Sala`
- `Responsable QA`
- `Dirección Cultivo`
- `Técnico Sistema`

## 9. Ficheros locales generados

Tras el primer arranque deben aparecer:

- `local_mirror/snapshot.json`
- `local_mirror/asset-manifest.json`
- `local_mirror/sync-queue.json`
- `local_mirror/history.json`
- `local_mirror/assets/`
- `local_iot/iot.db`

## 9.1 Estructura local IoT

La base `SQLite` local almacena:

- salas
- dispositivos
- lecturas historicas
- snapshots por sala
- alertas
- politicas

## 9.2 Informacion validada para S1

La carpeta `validated_info/` puede contener documentacion adicional validada para el asistente `S1`.

Formatos soportados:

- `.md`
- `.txt`
- `.pdf`
- `.json`

## 9.3 Activacion de S1 con LLM

`S1` funciona siempre en modo RAG local. Para activar `RAG + LLM` en el Mini PC:

1. crear o editar el override del servicio:

```bash
mkdir -p /etc/systemd/system/trazabilidad.service.d
nano /etc/systemd/system/trazabilidad.service.d/override.conf
```

2. definir las variables sin guardarlas en el repo:

```ini
[Service]
Environment=MQTT_URL=mqtt://javier:javier@127.0.0.1:1883
Environment=OPENAI_API_KEY=tu_clave_real
Environment=OPENAI_MODEL=gpt-4.1-mini
```

3. aplicar cambios:

```bash
systemctl daemon-reload
systemctl restart trazabilidad.service
```

4. verificar:

```bash
curl http://localhost:3001/api/agents/chat/health
```

Si no existe `OPENAI_API_KEY`, `S1` sigue funcionando en modo extractivo estricto.

## 9.4 Configuracion de actuadores Shelly

La configuracion de actuadores se mantiene en:

- `server/actuators.json`
- plantilla recomendada:
  - `server/actuators.template.json`

Cada actuador define:

- `id`
- `name`
- `room`
- `category`
- `driver`
- `ip`
- `relay`
- `enabled`
- bloque `automation`
- opcionalmente reglas generadas desde el chat guiado de automatización

Campos relevantes del bloque `automation`:

- `mode`: `metric`, `schedule` o `pulse`
- `metric`, `comparator`, `threshold`
- `desiredState`
- `durationSeconds`
- `cooldownSeconds`
- `startTime`, `endTime`
- `days`
- `pulseSeconds`

Modos disponibles:

- `metric`
- `schedule`
- `pulse`

El driver actual soportado es:

- `shelly-gen1`

Antes de activar un actuador:

- verificar IP real
- verificar relé correcto
- dejar `enabled: true`
- probar `ON/OFF` manualmente
- activar luego la automatización si procede

Para usar programación en lenguaje natural desde la app, el backend expone:

- `POST /api/actuators/automation/parse`
- `POST /api/actuators/automation/apply`

La ejecución real sigue siendo validada por el backend antes de guardarse o ejecutarse.

## 10. Problemas comunes

### 10.1 No conecta con Google Sheets

Revisar:

- `credenciales.json`
- permisos de la cuenta de servicio
- ID correcto de la hoja

### 10.2 No cargan imagenes

Revisar:

- que las URLs en la hoja sean accesibles
- que la descarga local de assets no falle

### 10.3 QR no abre en movil

Revisar:

- que movil y ordenador esten en la misma red si se usa local
- que el QR apunte a la URL correcta de la app

### 10.4 Error creando la base IoT local

Revisar:

- permisos de escritura del proyecto
- existencia de `local_iot/`
- instalacion correcta de `better-sqlite3`

### 10.5 Despliegue edge con Proxmox

Para produccion estable, seguir `docs/RUNBOOK_DESPLIEGUE_PROXMOX_IOT_TRAZABILIDAD.md`.

Perfil recomendado:

- `Mini PC + Proxmox` como plataforma principal
- `Raspberry Pi 5` como alternativa compacta soportada

### 10.6 MQTT no conecta

Revisar:

- servicio `mosquitto.service`
- puerto `1883`
- topics configurados
- `GET /api/iot/health` para confirmar `mqttConnected`
- override systemd de `trazabilidad.service` con `MQTT_URL`
- credenciales del broker MQTT en el Mini PC

### 10.7 El asistente no encuentra una respuesta

Revisar:

- que el documento exista en `docs/`, SOPs, `traza_argentina/` o `validated_info/`
- que el backend haya reindexado el RAG

Reindexado manual:

```bash
curl -X POST http://localhost:3001/api/agents/chat/reindex
```

### 10.8 El asistente falla con el modelo LLM

Revisar:

- que `OPENAI_API_KEY` sea valida
- que el servicio tenga cargada la variable en `systemd`
- que el modelo configurado sea accesible para esa cuenta

Comprobacion:

```bash
systemctl show trazabilidad.service --property=Environment --no-pager
```

### 10.9 El actuador Shelly no responde

Revisar:

- IP real del dispositivo en `server/actuators.json`
- conectividad de red al Shelly
- relé configurado
- `enabled: true`
- que el dispositivo responda a la API Shelly esperada
