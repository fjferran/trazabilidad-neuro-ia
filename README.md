# Neuro-IA Trazabilidad

Sistema de trazabilidad cannabica offline-first con QR, copia espejo local, sincronizacion contra Google Sheets, auditoria, backup, restauracion, usuarios locales y permisos por rol, ampliado con monitorizacion IoT por sala, base local `SQLite`, alertas operativas y agentes especializados.

## Documentacion

- `docs/TRAZABILIDAD_ARQUITECTURA.md`
  - diseno completo del sistema
  - requisitos funcionales y tecnicos
  - modelo de datos, APIs, QR, offline-first, conflictos y auditoria

- `docs/GUIA_INSTALACION.md`
  - instalacion desde cero
  - requisitos previos
  - arranque en desarrollo y produccion local

- `docs/GUIA_OPERACION.md`
  - flujo diario de trabajo
  - altas por fase
  - usuarios y roles
  - labores operativas
  - etiquetado QR
  - visor QR
  - sincronizacion y conflictos

- `docs/GUIA_BACKUP_Y_RECUPERACION.md`
  - exportacion de backup
  - restauracion desde UI y API
  - recomendaciones operativas

- `docs/PROMPTS_ANTIGRAVITY.md`
  - prompts por fases para reconstruir el sistema en Antigravity
  - prompt unico maestro listo para copiar y pegar

- `docs/TRAZABILIDAD_IOT_AGENTES_ARQUITECTURA.md`
  - arquitectura tecnica de IoT, agentes y despliegue edge
  - modelo de datos `SQLite`, APIs y perfiles hardware

- `SOP_IOT_001_Monitorizacion_IoT_GACP.md`
  - SOP GACP de monitorizacion IoT por sala
  - rangos operativos, alarmas, escalado y mantenimiento

- `docs/RUNBOOK_DESPLIEGUE_PROXMOX_IOT_TRAZABILIDAD.md`
  - puesta en marcha en `Mini PC + Proxmox`
  - despliegue de `trazabilidad-app`, `mqtt-broker` y base IoT

- `docs/FAT_SAT_IOT_TRAZABILIDAD.md`
  - pruebas de aceptacion tecnica y operativa del sistema IoT

- `deploy/minipc/README.md`
  - flujo de migracion al Mini PC desde este equipo
  - uso del script de sincronizacion por `SSH` + `rsync`

- `validated_info/README.md`
  - carpeta para documentacion validada adicional usada por el sistema RAG del asistente

## Resumen funcional

La app permite:

- gestionar geneticas, madres, clones, vegetativos, floracion y cosecha
- generar IDs acumulativas y QR por nodo
- dar de alta geneticas y fases productivas en modo local-first
- operar con usuarios locales y permisos por rol
- mostrar fichas visuales de trazabilidad enlazada
- usar una pestaña de `Labores` como checklist operativo por turno
- trabajar en local aunque falle internet
- sincronizar despues con Google Sheets
- descargar y servir assets locales
- auditar lecturas, cambios y sincronizaciones
- registrar actor y rol en eventos nuevos de auditoria
- exportar e importar backups completos del espejo local
- registrar telemetria IoT por sala en base local `SQLite`
- consultar estado IoT desde `Dashboard`, `Visor QR` y endpoints dedicados
- clasificar salas en `OK`, `WARNING`, `ALARM`, `STALE` u `OFFLINE`
- operar con agentes `S2-IoT` y `S2-E` para analitica y emergencias
- operar una pestaña dedicada `Datos IoT` con historico, exportaciones y gestion de alertas
- operar un `S1 Chat-Agent` con recuperacion documental estricta sobre SOPs, manuales, PDFs y carpeta `validated_info/`

## Capa IoT

La capa IoT se apoya en:

- salas cerradas:
  - `Sala de Clones`
  - `Sala de Madres`
  - `Sala de Vegetativo`
  - `Sala de Floración`
  - `Almacén Cosecha`
- base local `SQLite` en `local_iot/iot.db`
- endpoints REST para ingesta, estado, resumen, histórico y alertas
- hardware principal recomendado:
  - `Mini PC + Proxmox`
- hardware alternativo soportado:
  - `Raspberry Pi 5`

El backend actual resuelve la `Ubicación` del nodo hacia una sala IoT y añade contexto ambiental al visor QR y al estado general del sistema.

## S1 RAG

El asistente `S1` ya funciona con una capa RAG local que indexa:

- SOPs
- manuales y documentacion de `docs/`
- PDFs de geneticas y trazabilidad en `traza_argentina/`
- carpeta de informacion validada adicional en `validated_info/`

Comportamiento:

- si existe `OPENAI_API_KEY`, usa un LLM con contexto recuperado
- si no existe, usa un modo extractivo estricto basado en recuperacion documental
- si no encuentra evidencia suficiente, responde que no puede contestar con seguridad

Estado actual de produccion:

- `S1` ya esta operativo en el Mini PC
- el indice RAG se construye al arrancar el backend
- el modo `RAG + LLM` se activa configurando `OPENAI_API_KEY` en el servicio `trazabilidad.service`
- la clave no debe guardarse nunca en el repositorio

## Arranque rapido

Instalacion:

```bash
npm install
```

Desarrollo:

```bash
npm run server
npm run dev
```

Produccion local:

```bash
npm run build
node server/server.js
```

## Mini PC operativo

El sistema ya puede operar desde un `Mini PC` en red con:

- app desplegada en `/opt/trazabilidad`
- servicio `systemd`:
  - `trazabilidad.service`
- broker MQTT local:
  - `mosquitto.service`
- autenticacion MQTT actual:
  - usuario `javier`
  - password configurada en el Mini PC
- URL de acceso esperada:
  - `http://192.168.0.100:3001`

Comandos utiles en el Mini PC:

```bash
systemctl status trazabilidad.service
systemctl restart trazabilidad.service
systemctl status mosquitto
systemctl restart mosquitto
```

Comandos utiles desde este equipo:

```bash
bash deploy/minipc/deploy-current.sh
bash deploy/minipc/check-current.sh
```

Prueba basica de ingesta IoT por API:

```bash
curl -X POST http://localhost:3001/api/iot/ingest \
  -H 'Content-Type: application/json' \
  -d '{
    "room": "Sala de Floracion",
    "deviceId": "test-flor-01",
    "timestamp": "2026-03-21T18:00:00.000Z",
    "metrics": {
      "t": 25.5,
      "h": 62.1,
      "vpd": 0.95,
      "dli": 31.2,
      "substrate_t": 21.5,
      "ec": 2.1,
      "ph": 6.1
    }
  }'
```

## Rutas principales

- frontend en desarrollo: `http://localhost:5001`
- backend: `http://localhost:3001`
- frontend servido por backend compilado: `http://localhost:3001`

Rutas IoT principales:

- `POST /api/iot/ingest`
- `GET /api/iot/health`
- `GET /api/agents/iot/rooms/:room/status`
- `GET /api/agents/iot/rooms/:room/summary`
- `GET /api/agents/iot/rooms/:room/history`
- `POST /api/agents/emergency/evaluate`
- `GET /api/agents/emergency/active`
- `GET /api/agents/emergency/history`
- `POST /api/agents/emergency/:id/ack`
- `POST /api/agents/emergency/:id/resolve`

Rutas S1 / RAG:

- `POST /api/agents/chat`
- `GET /api/agents/chat/health`
- `POST /api/agents/chat/reindex`

Topics MQTT operativos:

- `trazabilidad/iot/sala/clones`
- `trazabilidad/iot/sala/madres`
- `trazabilidad/iot/sala/vegetativo`
- `trazabilidad/iot/sala/floracion`
- `trazabilidad/iot/sala/almacen-cosecha`

Autenticacion MQTT esperada:

- broker: `192.168.0.100:1883`
- usuario: `javier`
- password: configurada en el sistema remoto, no versionada en el repo

## Ficheros clave

- `src/App.jsx`
- `server/server.js`
- `server/iot.js`
- `docs/TRAZABILIDAD_ARQUITECTURA.md`
- `docs/TRAZABILIDAD_IOT_AGENTES_ARQUITECTURA.md`
- `docs/GUIA_INSTALACION.md`
- `docs/GUIA_OPERACION.md`
- `docs/GUIA_BACKUP_Y_RECUPERACION.md`
