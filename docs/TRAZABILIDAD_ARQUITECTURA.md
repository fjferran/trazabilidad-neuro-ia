# Diseno Completo de la App de Trazabilidad

## 1. Proposito del documento

Este documento define todos los requisitos funcionales, tecnicos y operativos necesarios para reconstruir la aplicacion de trazabilidad desde cero.

Debe servir para que cualquier equipo pueda:

- entender el problema de negocio
- reproducir la arquitectura
- rehacer backend y frontend
- reconstruir el modelo de datos
- implementar el modo offline-first
- generar IDs y QRs
- operar sincronizacion, auditoria y backups

## 2. Objetivo del sistema

El sistema debe gestionar la trazabilidad completa del cultivo desde la genetica base hasta la cosecha final.

La aplicacion debe:

- registrar nuevas geneticas base
- registrar nuevas entidades por fase biologica
- generar identificadores unicos y acumulativos
- generar etiquetas QR
- mostrar una ficha visual del nodo escaneado
- reconstruir el linaje retrospectivo completo
- funcionar en local aunque falle internet
- sincronizar despues contra Google Sheets
- mantener copia local persistente de datos y assets
- ofrecer auditoria, conflictos, backup y restauracion

## 3. Contexto operativo

Segun el SOP, el flujo de negocio tiene 6 niveles:

1. Genetica base
2. Planta madre
3. Lote de clones
4. Lote vegetativo
5. Lote de floracion
6. Lote de cosecha

Cada fila de Google Sheets representa un nodo trazable.

El sistema debe comportarse como una base enlazada tipo `coda.io`:

- cada nodo conoce su origen inmediato
- el visor puede navegar hacia atras hasta la genetica
- el QR siempre abre una ficha visual, no una hoja cruda

## 4. Requisitos funcionales

### 4.1 Altas de entidades

La app debe permitir crear:

- geneticas
- madres
- clones
- vegetativos
- floraciones
- cosechas

Reglas:

- una genetica puede crearse directamente en modo local-first
- una madre solo puede crearse desde una genetica valida
- un clon solo puede crearse desde una madre valida
- un vegetativo solo puede crearse desde un clon valido
- una floracion solo puede crearse desde un vegetativo valido
- una cosecha solo puede crearse desde una floracion valida

### 4.2 Trazabilidad retrospectiva

Desde cualquier ID, el visor debe devolver:

- nodo actual
- foto principal si existe
- metadatos de la fila
- documentos asociados
- origen inmediato
- ruta completa hasta genetica
- navegacion entre nodos ascendentes

En acceso desde QR movil, el visor debe entrar en modo standalone y ocultar navegacion general, cabecera global, buscador manual, historial del nodo y controles de edicion local.

### 4.3 Etiquetado QR

Cada nodo debe tener QR imprimible.

El QR debe contener una URL hacia la app con este patron:

`?search=<ID>`

No debe abrir Google Sheets directamente como flujo principal.

### 4.4 Operacion local

La aplicacion debe poder seguir funcionando si Google Sheets no responde.

Debe permitir:

- leer desde copia local persistente
- dar de alta nuevos registros en local
- editar registros existentes en local
- encolar sincronizaciones pendientes
- reintentar, descartar y resolver conflictos

### 4.5 Auditoria

Debe existir historial de:

- visualizacion de nodos por QR o busqueda
- altas locales
- ediciones locales
- sincronizaciones remotas exitosas
- errores de sincronizacion
- conflictos
- resoluciones manuales
- restauraciones de backup
- actor y rol para eventos generados desde UI

### 4.6 Backup

Debe permitir:

- exportar el estado local completo
- restaurar un backup exportado previamente

## 5. Requisitos no funcionales

- tiempo de respuesta rapido en red local
- operativa degradada sin internet
- persistencia local simple y portable
- arquitectura entendible y mantenible
- cero dependencias de BD SQL obligatoria
- despliegue simple en una maquina local o servidor pequeno

## 6. Stack tecnologico

### Frontend

- React
- Vite
- Axios
- Framer Motion
- QRCodeCanvas
- Tailwind/utilidades CSS existentes del proyecto

### Backend

- Node.js
- Express
- Google Sheets API (`googleapis`)
- sistema de ficheros local (`fs/promises`)

### Persistencia local

Se usa filesystem, no base de datos relacional.

## 7. Estructura de hojas obligatoria

La hoja maestra en Google Drive debe contener estas pestañas:

### 7.1 `Sheet_Genetica`

Campos:

- `ID Genética`
- `Variedad`
- `Linaje`
- `Notas`
- `Imagen_URL`
- `Documentos_URL`
- `Quimiotipo`
- `Cannabinoides`
- `Imagen_Etiqueta`
- `Terpenos`
- `Notas_Extra`

### 7.2 `Sheet_Madres`

- `ID Madre`
- `Genética`
- `Ubicación`
- `Fecha`
- `Estado`
- `Imagen`
- `Notas`

### 7.3 `Sheet_Clones`

- `ID Clon`
- `Madre Origen`
- `Genética`
- `Fecha`
- `Cantidad`
- `Estado`
- `Notas`

### 7.4 `Sheet_Lotes`

- `ID Lote`
- `ID Origen`
- `Ubicación`
- `Fecha`
- `Estado`
- `Cantidad`
- `Notas`

### 7.5 `Sheet_Floracion`

- `ID Lote`
- `ID Origen`
- `Fecha`
- `Ubicación`
- `Estado`
- `Cantidad`
- `Notas`

### 7.6 `Sheet_Cosecha`

- `ID Lote`
- `ID Origen`
- `Fecha Cosecha`
- `Peso Húmedo (g)`
- `Peso Seco (g)`
- `Ubicación`
- `Notas`

## 8. Reglas de negocio de IDs

Las IDs son acumulativas y reflejan el linaje.

### 8.1 Madre

Formato:

`[PREFIJO_3L]-PM-[NUM]-[YY]`

Ejemplo:

`PAC-PM-1-26`

Donde `PREFIJO_3L` son las 3 primeras letras de la genetica en mayusculas.

### 8.2 Clon

Formato:

`[ID_MADRE]-CL-[NUM]`

Ejemplo:

`CBG-PM-1-26-CL-1`

### 8.3 Vegetativo

Formato:

`[ID_CLON]-V`

### 8.4 Floracion

Formato:

`[ID_VEGETATIVO]F`

### 8.5 Cosecha

Formato:

`[ID_FLORACION]C`

## 9. Modelo conceptual

Cada fila se transforma en un nodo normalizado.

Estructura logica:

```js
{
  (id,
    type,
    typeLabel,
    sheetName,
    gid,
    rowNumber,
    parentId,
    parentType,
    displayName,
    image,
    localAssets,
    sheetLink,
    data,
    raw,
    syncStatus,
    syncMeta);
}
```

## 10. Reglas de relacion entre nodos

- genetica: sin padre
- madre -> genetica
- clon -> madre
- vegetativo -> clon
- floracion -> vegetativo
- cosecha -> floracion

La app no debe reconstruir el linaje solo por regex; debe preferir siempre la relacion real entre filas.

## 11. Arquitectura general

La arquitectura tiene 4 capas:

1. Google Sheets como fuente maestra externa
2. espejo local persistente en disco
3. indice relacional en memoria
4. frontend visual y operativa QR

### 11.1 Componentes del backend

- carga de Google Sheets
- normalizacion de filas a nodos
- indice en memoria
- descarga de assets locales
- snapshot local
- cola de sincronizacion
- historial
- API REST

### 11.2 Componentes del frontend

- dashboard
- catalogo de geneticas
- panel de altas
- visor QR / pasaporte
- etiquetado QR
- sincronizacion local
- auditoria global

## 12. Espejo local persistente

Ruta local:

- `local_mirror/snapshot.json`
- `local_mirror/asset-manifest.json`
- `local_mirror/sync-queue.json`
- `local_mirror/history.json`
- `local_mirror/assets/...`

### 12.1 `snapshot.json`

Contiene:

- `savedAt`
- `source`
- `ranges`

### 12.2 `asset-manifest.json`

Mapea por ID local:

```json
{
  "CBG": {
    "image": "/local-mirror/assets/cbg/image.jpg",
    "documentos": "/local-mirror/assets/cbg/documentos.pdf"
  }
}
```

### 12.3 `sync-queue.json`

Contiene operaciones pendientes o ya resueltas.

Tipos:

- `append`
- `update`

Estados:

- `pending`
- `synced`
- `sync_error`
- `conflict`
- `discarded`

### 12.4 `history.json`

Registro cronologico de eventos del sistema.

## 13. Flujo offline-first

### 13.1 Lectura

1. al arrancar, el backend intenta cargar snapshot local
2. si Google esta disponible, refresca hojas y assets
3. si Google falla, sigue operando con el snapshot local

### 13.2 Alta local-first

1. el usuario crea una entidad
2. se calcula el ID final
3. se escribe primero en `snapshot` local
4. se actualiza el indice en memoria
5. se encola una operacion `append`
6. se intenta sincronizar contra Google

### 13.3 Edicion local-first

1. el usuario edita campos seguros de un nodo sincronizado
2. se actualiza la fila local
3. se encola una operacion `update`
4. se intenta sincronizar la fila remota correspondiente

## 14. Flujo de sincronizacion

El backend debe ejecutar un procesador de cola periodico.

Para cada operacion:

- `append`: inserta nueva fila o detecta duplicado remoto
- `update`: busca fila remota por ID y actualiza celdas

Si falla:

- pasa a `sync_error`

Si detecta choque:

- pasa a `conflict`

## 15. Politica de conflictos

### Conflicto tipico

`duplicate_remote_id`

El sistema debe guardar:

- `localData`
- `remoteData`
- `reason`

Resoluciones soportadas:

- `keep_local`: sobrescribe la fila remota con el contenido local
- `keep_remote`: descarta la operacion local conflictiva

## 16. Assets locales

La app debe descargar y servir en local:

- imagenes de geneticas
- documentos enlazados
- cannabinoides
- terpenos
- otros assets HTTP accesibles

Los assets descargados deben servirse desde:

`/local-mirror/assets/...`

## 17. Flujo QR

### 17.1 Generacion

El modulo `Etiquetado` debe:

- listar todos los nodos etiquetables
- generar QR con URL hacia la propia app
- incluir estado de sincronizacion visible

### 17.2 Lectura

Al leer el QR:

1. se abre la app con `?search=<ID>`
2. el visor entra en modo standalone para movil
3. el visor consulta `GET /api/search/:id`
4. se muestra ficha visual completa
5. se registra auditoria `node_view`

## 18. Vistas del frontend

### 18.1 Dashboard

Debe mostrar:

- actividad reciente
- grafico basico
- estado del espejo
- cola pendiente
- conflictos
- import/export de backup

### 18.2 Geneticas

Debe mostrar catalogo visual de geneticas con foto y enlaces.

### 18.3 Pasaporte / altas

Debe permitir crear nuevas entidades por fase con validacion de origen.

### 18.4 Visor QR

Debe mostrar:

- imagen
- tipo
- ID
- estado de sync
- pestaña
- fila
- edicion local
- datos de la fila
- origen inmediato
- ruta completa
- historial del nodo

### 18.5 Etiquetado

Debe permitir:

- buscar entidad
- generar QR
- ver tipo, variedad, origen y sync status
- imprimir etiqueta

### 18.6 Auditoria

Debe permitir:

- ver historial global
- filtrar por texto y accion
- exportar auditoria

## 19. Endpoints necesarios

### Salud y espejo

- `GET /api/health`
- `GET /api/mirror/status`
- `POST /api/mirror/sync`

### Cola

- `POST /api/mirror/queue/:id/retry`
- `POST /api/mirror/queue/:id/discard`
- `POST /api/mirror/queue/:id/resolve-local`
- `POST /api/mirror/queue/:id/resolve-remote`

### Datos

- `GET /api/options`
- `GET /api/search/:id`
- `GET /api/trace/:id`
- `POST /api/entity`
- `PATCH /api/node/:id`

### Auditoria

- `GET /api/history`
- `GET /api/history/:id`
- `GET /api/history/export`

### Backup

- `GET /api/backup/status`
- `GET /api/backup/export`
- `POST /api/backup/restore`

## 20. Contratos minimos de API

### `GET /api/search/:id`

```json
{
  "status": "success",
  "type": "Clon",
  "sheetLink": "...",
  "node": {
    "id": "CBG-PM-1-26-CL-1",
    "type": "clon",
    "typeLabel": "Clon",
    "image": "...",
    "parentId": "CBG-PM-1-26",
    "parentType": "madre",
    "rowNumber": 2,
    "sheetName": "Sheet_Clones",
    "syncStatus": "synced",
    "syncMeta": null
  },
  "data": {},
  "linaje": []
}
```

### `POST /api/entity`

```json
{
  "status": "success",
  "message": "clon creado correctamente en local",
  "qr_id": "CBG-PM-1-26-CL-2",
  "sync": {
    "mode": "local_first",
    "queued": "queue-id",
    "pending": 0
  }
}
```

### `PATCH /api/node/:id`

```json
{
  "status": "success",
  "message": "CBG-PM-1-26 actualizado en local",
  "id": "CBG-PM-1-26",
  "sync": {
    "mode": "local_first_update",
    "queued": "queue-id",
    "pending": 0
  }
}
```

## 21. Validaciones obligatorias

- no crear entidades sin origen valido
- no permitir IDs duplicadas en local
- no permitir IDs duplicadas pendientes en cola
- no editar nodos con `pending_sync` o `conflict`
- validar backup antes de restaurar

## 22. Seguridad operativa minima

- la app no debe requerir acceso directo del usuario a Google Sheets
- el visor QR es solo lectura salvo los formularios locales autorizados
- los backups deben poder exportarse como JSON portable
- la restauracion debe reemplazar el espejo local de forma consistente

## 23. Roles y permisos

La aplicacion debe soportar al menos estos roles operativos:

- `Operario`
- `Calidad`
- `Dirección Cultivo`
- `Técnico Sistema`

Permisos base recomendados:

- `Operario`
  - acceso a dashboard, labores, pasaporte, visor QR, etiquetado, geneticas y auditoria basica
  - sin acceso a acciones de sync/backup/conflictos
- `Calidad`
  - acceso a dashboard, labores, visor QR, geneticas y auditoria
  - sin edicion local ni acciones tecnicas de sincronizacion
- `Dirección Cultivo`
  - acceso amplio a vistas operativas, auditoria, sync y resolucion de conflictos
- `Técnico Sistema`
  - acceso total operativo y tecnico
  - puede sincronizar, restaurar backups, resolver conflictos y editar nodos local-first

Las labores tambien pueden mostrar rol recomendado por bloque funcional.

La autenticacion actual puede ser local y simple, con seleccion de usuario persistida en navegador, siempre que el sistema refleje el rol activo en permisos y auditoria.

## 24. Estructura de carpetas minima

```text
src/
  App.jsx
server/
  server.js
docs/
  TRAZABILIDAD_ARQUITECTURA.md
local_mirror/
  snapshot.json
  asset-manifest.json
  sync-queue.json
  history.json
  assets/
credenciales.json
package.json
vite.config.js
```

## 25. Configuracion y arranque desde cero

### 25.1 Requisitos previos

- Node.js 18+
- proyecto Google Cloud con API Sheets habilitada
- cuenta de servicio con acceso a la hoja
- fichero `credenciales.json`

### 25.2 Instalacion

```bash
npm install
```

### 25.3 Desarrollo

```bash
npm run dev
npm run server
```

### 25.4 Produccion local

```bash
npm run build
node server/server.js
```

La app sirve frontend compilado desde `dist` y backend desde el mismo proceso.

## 26. Requisitos de reproducibilidad exacta

Para resolver el proyecto desde cero deben respetarse estos puntos:

1. mantener las 6 pestañas y sus columnas
2. convertir cada fila en nodo relacional
3. implementar espejo local en memoria y disco
4. implementar cola local-first de `append` y `update`
5. generar IDs acumulativas por fase
6. generar QR hacia la app, no hacia la hoja
7. reconstruir trazabilidad ascendente real
8. descargar assets remotos a local
9. soportar conflictos y resolucion manual
10. soportar backup, restore e historial
11. incluir auditoria global y por nodo

## 27. Estado actual implementado

Actualmente ya existe una implementacion funcional de:

- alta local-first de geneticas
- espejo local persistente
- descarga de assets locales
- indice relacional por nodo
- altas local-first
- edicion local-first
- cola de sincronizacion
- deteccion de duplicados y conflictos
- resolucion manual de conflictos
- QR visual con visor
- historial por nodo
- auditoria global
- usuarios locales con rol activo en interfaz
- actor y rol visibles en eventos nuevos de auditoria
- export/import de backup

## 28. Trabajo futuro recomendado

- filtros por fecha en auditoria
- autenticacion local persistente con catalogo gestionable de usuarios
- pantalla de diffs mas rica
- importacion incremental de backup
- pruebas automaticas de integracion
- cifrado o firma de backups si hay requisitos regulatorios
