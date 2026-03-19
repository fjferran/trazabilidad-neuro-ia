# Neuro-IA Trazabilidad

Sistema de trazabilidad cannabica offline-first con QR, copia espejo local, sincronizacion contra Google Sheets, auditoria, backup y restauracion.

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

## Resumen funcional

La app permite:

- gestionar geneticas, madres, clones, vegetativos, floracion y cosecha
- generar IDs acumulativas y QR por nodo
- mostrar fichas visuales de trazabilidad enlazada
- trabajar en local aunque falle internet
- sincronizar despues con Google Sheets
- descargar y servir assets locales
- auditar lecturas, cambios y sincronizaciones
- exportar e importar backups completos del espejo local

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

## Rutas principales

- frontend en desarrollo: `http://localhost:5001`
- backend: `http://localhost:3001`
- frontend servido por backend compilado: `http://localhost:3001`

## Ficheros clave

- `src/App.jsx`
- `server/server.js`
- `docs/TRAZABILIDAD_ARQUITECTURA.md`
- `docs/GUIA_INSTALACION.md`
- `docs/GUIA_OPERACION.md`
- `docs/GUIA_BACKUP_Y_RECUPERACION.md`
