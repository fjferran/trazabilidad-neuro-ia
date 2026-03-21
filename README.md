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

## Ficheros clave

- `src/App.jsx`
- `server/server.js`
- `server/iot.js`
- `docs/TRAZABILIDAD_ARQUITECTURA.md`
- `docs/TRAZABILIDAD_IOT_AGENTES_ARQUITECTURA.md`
- `docs/GUIA_INSTALACION.md`
- `docs/GUIA_OPERACION.md`
- `docs/GUIA_BACKUP_Y_RECUPERACION.md`
