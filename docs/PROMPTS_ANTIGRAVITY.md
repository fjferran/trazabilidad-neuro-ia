# Prompts para Desarrollar la App en Antigravity desde Cero

## Objetivo

Este documento contiene una secuencia de prompts pensados para reconstruir la app completa dentro de Antigravity desde cero.

La idea es usarlos por fases, no todos a la vez.

Cada prompt asume que el agente debe:

- leer el repositorio actual
- crear o modificar los archivos necesarios
- seguir convenciones coherentes
- verificar con build o chequeos cuando aplique

## Recomendacion de uso

Orden sugerido:

1. Prompt maestro de arquitectura
2. Prompt de backend base
3. Prompt de frontend base
4. Prompt de offline-first
5. Prompt de QR y trazabilidad visual
6. Prompt de sincronizacion y conflictos
7. Prompt de auditoria y backup
8. Prompt de documentacion final

---

## 1. Prompt Maestro de Arquitectura

```text
Quiero que reconstruyas desde cero una aplicacion de trazabilidad cannabica llamada Neuro-IA Trazabilidad.

El sistema debe gestionar 6 niveles de trazabilidad:
1. Genetica base
2. Planta madre
3. Lote de clones
4. Lote vegetativo
5. Lote de floracion
6. Lote de cosecha

La fuente maestra externa es Google Sheets, pero la app debe funcionar en modo offline-first con copia espejo local persistente.

Quiero que diseñes y dejes implementada una arquitectura con estas caracteristicas:

- frontend en React + Vite
- backend en Node + Express
- Google Sheets API como origen remoto
- espejo local persistente en disco
- indice relacional en memoria por nodo
- generacion de IDs acumulativas por fase
- generacion de QR por nodo
- visor visual de trazabilidad completa
- cola local-first de sincronizacion hacia Google Sheets
- deteccion de conflictos y resolucion manual
- auditoria de cambios y lecturas
- exportacion e importacion de backups

Cada fila de Google Sheets debe convertirse en un nodo enlazado con su origen inmediato.

Las hojas son:
- Sheet_Genetica
- Sheet_Madres
- Sheet_Clones
- Sheet_Lotes
- Sheet_Floracion
- Sheet_Cosecha

Quiero que empieces por definir la arquitectura de carpetas, modelo de datos, contratos API y flujo general de sincronizacion. Luego implementa la base del proyecto siguiendo ese diseño.

Cuando termines, resume:
- archivos creados
- decisiones de arquitectura
- endpoints principales
- como arrancar el proyecto
```

---

## 2. Prompt de Backend Base

```text
Implementa el backend base para la app de trazabilidad.

Requisitos:
- Node + Express
- conexion con Google Sheets usando googleapis
- definicion centralizada de hojas y columnas
- normalizacion de cada fila como nodo
- indice relacional en memoria por ID y por tipo
- rutas:
  - GET /api/health
  - GET /api/options
  - GET /api/search/:id
  - GET /api/trace/:id
  - POST /api/entity

Modelo de nodo esperado:
- id
- type
- typeLabel
- sheetName
- rowNumber
- parentId
- parentType
- image
- data
- raw
- syncStatus

Relaciones:
- madre -> genetica
- clon -> madre
- vegetativo -> clon
- floracion -> vegetativo
- cosecha -> floracion

Implementa helpers claros para:
- leer rangos
- convertir filas en objetos
- construir nodos
- construir linaje

Verifica con chequeo de sintaxis al final.
```

---

## 3. Prompt de Frontend Base

```text
Implementa el frontend base de la app con React.

Quiero estas vistas:
- Dashboard
- Geneticas
- Pasaporte/Altas
- Visor QR
- Etiquetado

Requisitos visuales:
- interfaz clara, profesional y usable en desktop y movil
- sidebar de navegacion
- dashboard con estado del sistema
- vista de geneticas con fotos y enlaces
- modulo de altas por fase
- visor QR con ficha visual del nodo y su linaje
- etiquetado con generacion de QR e impresion

Conecta el frontend al backend usando Axios.

El visor QR debe usar GET /api/search/:id.

El modulo de etiquetado debe generar una URL tipo:
?search=<ID>

Verifica que compile con npm run build.
```

---

## 4. Prompt de Offline-First y Espejo Local

```text
Quiero convertir la app en un sistema offline-first real.

Implementa un espejo local persistente en disco usando archivos JSON.

Archivos requeridos:
- local_mirror/snapshot.json
- local_mirror/asset-manifest.json
- local_mirror/sync-queue.json
- local_mirror/history.json
- local_mirror/assets/

Comportamiento:
- al arrancar, cargar snapshot local si existe
- si Google Sheets esta disponible, refrescar datos remotos
- si Google falla, seguir operando desde local
- al crear nuevas entidades, escribir primero en local
- luego encolar sincronizacion hacia Google

Quiero que el backend soporte cola persistente de operaciones:
- append
- update

Y estados:
- pending
- synced
- sync_error
- conflict
- discarded

Implementa endpoints para exponer el estado del espejo y la cola.
```

---

## 5. Prompt de IDs y Reglas de Negocio

```text
Implementa la generacion automatica de IDs segun el SOP.

Reglas:
- Madre: [PREFIJO_3L]-PM-[NUM]-[YY]
- Clon: [ID_MADRE]-CL-[NUM]
- Vegetativo: [ID_CLON]-V
- Floracion: [ID_VEGETATIVO]F
- Cosecha: [ID_FLORACION]C

Validaciones obligatorias:
- no crear fases sin origen valido
- no duplicar IDs en local
- no duplicar IDs pendientes en cola
- no permitir saltos de fase

Quiero que POST /api/entity calcule el ID definitivo en backend y no dependa solo del frontend.

Tambien adapta el formulario frontend para que muestre contexto del origen seleccionado.
```

---

## 6. Prompt de QR y Visor Visual

```text
Quiero perfeccionar el flujo QR.

Requisitos:
- cada nodo debe poder imprimirse como etiqueta QR
- el QR debe abrir la app y mostrar la ficha visual del nodo
- al abrir desde QR en movil, la ficha debe entrar en modo standalone sin sidebar, cabecera global ni controles de edicion
- no debe abrir Google Sheets como flujo principal
- el visor debe mostrar:
  - imagen
  - tipo
  - ID
  - estado de sincronizacion
  - hoja y fila
  - datos de la fila
  - origen inmediato
  - ruta completa hasta genetica
  - historial del nodo

Tambien quiero navegacion entre nodos ascendentes desde el visor.

Mejora la pantalla de etiquetado para mostrar estado sync y origen del nodo en la etiqueta previa.
```

---

## 7. Prompt de Assets Locales

```text
Quiero que la app descargue y sirva localmente los assets referenciados por Google Sheets.

Assets a soportar:
- imagenes de geneticas
- documentos URL
- PDFs de cannabinoides
- PDFs de terpenos

Requisitos:
- descargar assets HTTP en local_mirror/assets/
- mapearlos en asset-manifest.json
- reescribir el nodo para preferir asset local cuando exista
- servirlos desde una ruta tipo /local-mirror/assets/...

Si la descarga falla, usar la URL remota como fallback.
```

---

## 8. Prompt de Sincronizacion y Conflictos

```text
Implementa un sistema completo de sincronizacion local -> Google Sheets con manejo de conflictos.

Requisitos:
- procesador de cola periodico
- endpoint manual para sincronizar ahora
- reintento manual de items fallidos
- descarte manual
- resolucion asistida de conflictos:
  - mantener local
  - mantener remoto

Caso de conflicto principal:
- duplicate_remote_id

En el conflicto debe guardarse:
- localData
- remoteData
- reason

El frontend debe mostrar:
- operaciones pendientes
- errores
- conflictos
- acciones de resolucion
```

---

## 9. Prompt de Edicion Local-First

```text
Quiero que el visor QR permita editar campos seguros de un nodo en modo local-first.

Campos editables tipicos:
- Ubicación
- Estado
- Cantidad
- Fecha
- Fecha Cosecha
- Peso Húmedo (g)
- Peso Seco (g)
- Notas

Requisitos:
- endpoint PATCH /api/node/:id
- escribir primero en local
- encolar update
- sincronizar despues a Google
- bloquear edicion si el nodo esta pending_sync o conflict
- mostrar feedback visual al guardar
```

---

## 10. Prompt de Auditoria

```text
Quiero un modulo de auditoria global y por nodo.

Registrar eventos como:
- node_view
- local_append
- local_update
- remote_append_synced
- remote_update_synced
- sync_error
- sync_conflict
- queue_retry
- queue_discarded
- conflict_resolve_local
- conflict_resolve_remote
- backup_restored

Requisitos:
- persistir en local_mirror/history.json
- GET /api/history
- GET /api/history/:id
- GET /api/history/export
- pantalla de auditoria con filtros por texto y accion
- exportacion JSON desde la UI
```

---

## 11. Prompt de Backup y Restore

```text
Quiero implementar backup y restauracion completa del espejo local.

Requisitos:
- GET /api/backup/export
- GET /api/backup/status
- POST /api/backup/restore

El backup debe incluir:
- ranges del espejo
- cola
- manifest de assets
- metadatos de sincronizacion

El frontend debe permitir:
- exportar backup
- importar backup desde selector de archivo JSON
- refrescar estado tras restaurar

Valida el backup antes de restaurarlo.
```

---

## 12. Prompt de Documentacion Final

```text
Quiero que generes la documentacion completa del proyecto para que pueda reconstruirse desde cero.

Necesito estos documentos:
- README.md maestro
- docs/TRAZABILIDAD_ARQUITECTURA.md
- docs/GUIA_INSTALACION.md
- docs/GUIA_OPERACION.md
- docs/GUIA_BACKUP_Y_RECUPERACION.md

La documentacion debe incluir:
- objetivo del sistema
- requisitos funcionales y tecnicos
- estructura exacta de hojas
- reglas de IDs
- arquitectura frontend/backend
- espejo local y cola
- endpoints y contratos
- flujo QR
- sincronizacion y conflictos
- auditoria y backup
- pasos de instalacion y arranque
```

---

## 13. Prompt de Verificacion Final

```text
Haz una revision final integral del proyecto.

Quiero que:
- limpies y formatees el codigo
- verifiques build del frontend
- verifiques sintaxis del backend
- revises consistencia entre documentacion y codigo
- detectes archivos generados o ruido innecesario
- propongas una estructura lista para commit

Al terminar, resume:
- que se ha validado
- que riesgos quedan
- que pasos recomendarias antes de desplegar
```

## 14. Estrategia recomendada en Antigravity

Si el desarrollo se hace en Antigravity, la mejor secuencia es:

1. pegar el Prompt Maestro
2. ejecutar por iteraciones cortas
3. despues usar prompts especializados por bloque
4. verificar siempre con build o chequeos
5. cerrar con documentacion y limpieza

## 15. Nota final

Estos prompts estan pensados para una reconstruccion controlada del proyecto actual, no para un MVP generico. Deben usarse respetando:

- la estructura de hojas definida
- las reglas del SOP
- el modelo offline-first
- el visor QR visual
- la copia espejo local persistente

---

## 16. Prompt Unico Maestro

```text
Quiero que reconstruyas desde cero una aplicacion llamada Neuro-IA Trazabilidad para gestion de trazabilidad cannabica integral.

La app debe cubrir 6 niveles de trazabilidad:
1. Genetica base
2. Planta madre
3. Lote de clones
4. Lote vegetativo
5. Lote de floracion
6. Lote de cosecha

La fuente maestra externa es Google Sheets, pero el sistema debe ser offline-first. Eso significa que debe trabajar principalmente en local con una copia espejo persistente y sincronizar despues contra Google Drive.

Requisitos funcionales obligatorios:
- cada fila de Google Sheets se convierte en un nodo trazable
- cada nodo conoce su origen inmediato
- el sistema reconstruye el linaje completo hasta genetica
- el alta de una fase solo puede hacerse desde la fase anterior valida
- la app genera IDs acumulativas segun SOP
- la app genera etiquetas QR
- el QR abre una ficha visual de la app, no la hoja cruda
- la app permite altas y ediciones local-first
- la app permite alta local-first de geneticas base
- la app mantiene cola de sincronizacion hacia Google Sheets
- la app detecta conflictos y permite resolverlos manualmente
- la app descarga assets remotos en local
- la app mantiene auditoria completa de lecturas, cambios y sync
- la app permite exportar e importar backups completos del espejo local

Las hojas requeridas son:
- Sheet_Genetica
- Sheet_Madres
- Sheet_Clones
- Sheet_Lotes
- Sheet_Floracion
- Sheet_Cosecha

Columnas esperadas:

Sheet_Genetica:
- ID Genética
- Variedad
- Linaje
- Notas
- Imagen_URL
- Documentos_URL
- Quimiotipo
- Cannabinoides
- Imagen_Etiqueta
- Terpenos
- Notas_Extra

Sheet_Madres:
- ID Madre
- Genética
- Ubicación
- Fecha
- Estado
- Imagen
- Notas

Sheet_Clones:
- ID Clon
- Madre Origen
- Genética
- Fecha
- Cantidad
- Estado
- Notas

Sheet_Lotes:
- ID Lote
- ID Origen
- Ubicación
- Fecha
- Estado
- Cantidad
- Notas

Sheet_Floracion:
- ID Lote
- ID Origen
- Fecha
- Ubicación
- Estado
- Cantidad
- Notas

Sheet_Cosecha:
- ID Lote
- ID Origen
- Fecha Cosecha
- Peso Húmedo (g)
- Peso Seco (g)
- Ubicación
- Notas

Reglas de IDs:
- Madre: [PREFIJO_3L]-PM-[NUM]-[YY]
- Clon: [ID_MADRE]-CL-[NUM]
- Vegetativo: [ID_CLON]-V
- Floracion: [ID_VEGETATIVO]F
- Cosecha: [ID_FLORACION]C

Arquitectura requerida:
- frontend en React + Vite
- backend en Node + Express
- Google Sheets API con googleapis
- copia espejo local persistente en disco
- indice relacional en memoria por nodo
- assets locales en carpeta local_mirror/assets
- historial persistente en JSON
- cola persistente de operaciones append/update

Ficheros locales requeridos:
- local_mirror/snapshot.json
- local_mirror/asset-manifest.json
- local_mirror/sync-queue.json
- local_mirror/history.json
- local_mirror/assets/

Estados de sincronizacion requeridos:
- pending
- synced
- sync_error
- conflict
- discarded

Resolucion de conflictos requerida:
- mantener local
- mantener remoto

Vistas del frontend requeridas:
- Dashboard
- Geneticas
- Pasaporte / altas
- Visor QR
- Etiquetado
- Auditoría

El Dashboard debe mostrar:
- estado de conexion
- estado del espejo
- cola pendiente
- conflictos
- opciones de sync
- export/import de backup

El Visor QR debe mostrar:
- imagen
- tipo
- ID
- estado de sincronizacion
- hoja y fila
- datos de la fila
- origen inmediato
- ruta completa hasta genetica
- historial del nodo
- edicion local-first de campos seguros

El modulo de Etiquetado debe:
- listar nodos
- generar QR hacia ?search=<ID>
- mostrar tipo, origen y syncStatus
- permitir imprimir

La Auditoría debe:
- listar historial global
- permitir filtros por texto y accion
- permitir exportacion JSON

Endpoints minimos requeridos:
- GET /api/health
- GET /api/mirror/status
- POST /api/mirror/sync
- POST /api/mirror/queue/:id/retry
- POST /api/mirror/queue/:id/discard
- POST /api/mirror/queue/:id/resolve-local
- POST /api/mirror/queue/:id/resolve-remote
- GET /api/options
- GET /api/search/:id
- GET /api/trace/:id
- POST /api/entity
- PATCH /api/node/:id
- GET /api/history
- GET /api/history/:id
- GET /api/history/export
- GET /api/backup/status
- GET /api/backup/export
- POST /api/backup/restore

Comportamiento offline-first obligatorio:
- leer desde snapshot local si Google falla
- escribir primero en local
- reflejar inmediatamente los cambios en visor y etiquetado
- encolar operaciones para sync posterior
- intentar sincronizacion automatica y manual

Auditoria requerida para eventos como:
- node_view
- local_append
- local_update
- remote_append_synced
- remote_update_synced
- sync_error
- sync_conflict
- queue_retry
- queue_discarded
- conflict_resolve_local
- conflict_resolve_remote
- backup_restored

Quiero tambien una capa simple de usuarios locales con roles operativos (`Operario`, `Calidad`, `Dirección Cultivo`, `Técnico Sistema`) y que la auditoria muestre actor y rol en eventos nuevos.

Documentacion final requerida:
- README.md
- docs/TRAZABILIDAD_ARQUITECTURA.md
- docs/GUIA_INSTALACION.md
- docs/GUIA_OPERACION.md
- docs/GUIA_BACKUP_Y_RECUPERACION.md

Quiero que desarrolles esto por fases, pero manteniendo coherencia global. Empieza por crear la arquitectura base, luego backend, luego frontend, luego offline-first, luego QR, luego sincronizacion/conflictos, luego auditoria y backup, y finalmente la documentacion. Verifica build y sintaxis al final de cada fase relevante.
```
