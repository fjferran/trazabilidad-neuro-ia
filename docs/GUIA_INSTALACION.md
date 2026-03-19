# Guia de Instalacion

## 1. Objetivo

Esta guia explica como instalar y arrancar la app de trazabilidad desde cero en una maquina nueva.

## 2. Requisitos previos

- macOS, Linux o Windows con Node.js 18+
- acceso al repositorio del proyecto
- fichero `credenciales.json` de Google Cloud
- acceso de la cuenta de servicio a la hoja de Google Sheets
- impresora de etiquetas opcional para el modulo QR

## 3. Estructura minima esperada

El proyecto debe contener al menos:

- `src/App.jsx`
- `server/server.js`
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

Debe compartirse con la cuenta de servicio usada por `credenciales.json`.

## 5. Instalacion de dependencias

```bash
npm install
```

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

## 8. Primera comprobacion

Verificar:

1. la app abre
2. el dashboard carga
3. el sidebar muestra estado `Conectado`
4. `Google Sheets activo`
5. el espejo local se inicializa

## 9. Ficheros locales generados

Tras el primer arranque deben aparecer:

- `local_mirror/snapshot.json`
- `local_mirror/asset-manifest.json`
- `local_mirror/sync-queue.json`
- `local_mirror/history.json`
- `local_mirror/assets/`

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
