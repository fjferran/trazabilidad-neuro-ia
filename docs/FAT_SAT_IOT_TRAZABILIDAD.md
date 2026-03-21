# FAT y SAT para Trazabilidad e IoT

## 1. Objetivo

Definir las pruebas de aceptacion tecnica y operativa del sistema desplegado de trazabilidad, IoT y agentes especializados.

- `FAT`: validacion tecnica previa a operacion real
- `SAT`: validacion en entorno real de uso

## 2. FAT - Factory Acceptance Test

### 2.1 Infraestructura

- host `Mini PC` instalado y estable
- `Proxmox` accesible por web
- almacenamiento `NVMe` detectado y operativo
- red LAN operativa
- `UPS` instalado o documentado
- hora/NTP correctos

Criterio de aceptacion:

- todo accesible y estable tras reinicio controlado

### 2.2 Contenedores y servicios base

- `LXC trazabilidad-app` creado y operativo
- `LXC mqtt-broker` creado y operativo
- recursos asignados segun diseno
- reinicio limpio de contenedores
- persistencia montada correctamente

Criterio de aceptacion:

- servicios arrancan automaticamente y sin error

### 2.3 Aplicacion de trazabilidad

- frontend accesible
- backend responde
- rutas principales operativas
- sistema actual no degradado por la nueva infraestructura

Criterio de aceptacion:

- trazabilidad existente funciona igual o mejor que antes

### 2.4 Broker MQTT

- recepcion de mensajes de prueba
- topics por sala correctos
- conectividad desde gateway/ESP
- conectividad desde app backend
- logs visibles

Criterio de aceptacion:

- el broker recibe y distribuye mensajes sin perdida observable en pruebas basicas

### 2.5 Base IoT SQLite

- DB creada
- tablas creadas correctamente
- seeds de salas cargados
- politicas cargadas
- consultas basicas exitosas

Criterio de aceptacion:

- estructura integra y accesible desde backend

### 2.6 Ingesta y normalizacion

- payload valido se almacena
- payload invalido se rechaza/controla
- `Almacen Cosecha` ignora metricas no aplicables
- mapeo `topic -> sala` correcto
- timestamps correctos

Criterio de aceptacion:

- solo datos validos alimentan snapshots y agentes

### 2.7 Snapshots y alertas

- cada sala genera snapshot
- cambio de estado `OK/WARNING/ALARM` operativo
- reglas `STALE/OFFLINE` operativas
- alertas se abren y actualizan
- alertas criticas requieren `ack`

Criterio de aceptacion:

- el motor de politicas produce estados coherentes en casos de prueba

### 2.8 UI IoT

- `Dashboard` muestra salas y estados
- `SearchView` muestra contexto IoT correcto
- alertas visibles
- timestamps visibles
- datos no disponibles se muestran como `N/D`

Criterio de aceptacion:

- la UI refleja fielmente el estado backend

### 2.9 Agentes

- `S2-IoT` devuelve resumen y clasificacion
- `S2-E` devuelve severidad y escalado
- `S1` responde con contexto y fuentes
- ningun agente ejecuta acciones sobre hardware

Criterio de aceptacion:

- agentes utiles, coherentes y sin actuacion no autorizada

### 2.10 Backup y restore

- snapshot Proxmox creado
- backup logico ejecutado
- restore de prueba documentado
- consistencia de datos tras restore

Criterio de aceptacion:

- recuperacion posible y demostrada

## 3. SAT - Site Acceptance Test

### 3.1 Operacion en entorno real

- sensores reales publican
- cada sala muestra lecturas recientes
- el sistema funciona en red local real
- acceso web desde terminales previstos

Criterio de aceptacion:

- operacion basica diaria viable

### 3.2 Validacion por sala

- `Sala de Clones` correcta
- `Sala de Madres` correcta
- `Sala de Vegetativo` correcta
- `Sala de Floracion` correcta
- `Almacen Cosecha` correcta
- mapeo de `Ubicacion` de lotes a sala correcto

Criterio de aceptacion:

- todas las salas tienen contexto correcto y consistente

### 3.3 Validacion de thresholds

- casos reales o simulados activan `WARNING`
- casos criticos activan `ALARM`
- perdida de datos activa `STALE/OFFLINE`
- `Floracion` y `Almacen Cosecha` muestran criticidad reforzada

Criterio de aceptacion:

- thresholds y severidades responden segun diseno aprobado

### 3.4 Validacion operativa del visor QR

- un lote en cada sala muestra el contexto IoT correcto
- alertas de sala aparecen en el visor
- resumen del agente IoT visible
- acceso contextual al asistente funciona

Criterio de aceptacion:

- trazabilidad e IoT quedan integrados operativamente

### 3.5 Validacion documental GACP

- registro diario IoT utilizable
- matriz de escalado aplicable
- anexo de mantenimiento/calibracion utilizable
- roles y responsables entendidos por operacion

Criterio de aceptacion:

- la operacion puede documentarse conforme al SOP

### 3.6 Validacion de resiliencia

- reinicio controlado del broker
- reinicio controlado de la app
- validacion tras reinicio del host si se decide probar
- confirmacion de persistencia de datos

Criterio de aceptacion:

- el sistema vuelve a servicio sin perdida critica de configuracion o datos

## 4. Casos de prueba minimos recomendados

### Caso 1

- lectura valida de `Sala de Clones`
- resultado esperado:
  - snapshot `OK`

### Caso 2

- humedad alta sostenida en `Sala de Floracion`
- resultado esperado:
  - `WARNING` o `ALARM` segun umbral
  - alerta visible
  - recomendacion de accion

### Caso 3

- temperatura y humedad altas en `Almacen Cosecha`
- resultado esperado:
  - `ALARM high`
  - escalado a responsable adecuado

### Caso 4

- perdida de datos por encima del umbral
- resultado esperado:
  - `STALE` y luego `OFFLINE` segun politica

### Caso 5

- lote consultado en `SearchView`
- resultado esperado:
  - muestra sala correcta
  - muestra snapshot correcto
  - muestra alertas activas de la sala

### Caso 6

- consulta al `S1`
- resultado esperado:
  - explicacion contextual con fuentes

### Caso 7

- backup y restore de prueba
- resultado esperado:
  - sistema recuperable y consistente

## 5. Evidencias FAT/SAT a conservar

- fecha de prueba
- responsable
- entorno de prueba
- version del sistema
- version de politicas
- resultado por item
- incidencias detectadas
- acciones correctivas
- decision final:
  - `Aceptado`
  - `Aceptado con observaciones`
  - `No aceptado`

## 6. Formato resumido de acta FAT/SAT

| ID | Bloque | Prueba | Resultado esperado | Resultado observado | Estado | Responsable | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FAT-01 | Infraestructura | Acceso a Proxmox | Accesible | Correcto | OK | Tecnico Sistema |  |
| FAT-02 | MQTT | Publicacion de telemetria | Mensaje recibido | Correcto | OK | Tecnico Sistema |  |
| SAT-01 | Sala Floracion | Humedad alta sostenida | Alarma visible | Correcto | OK | QA/Cultivo |  |

Estados sugeridos:

- `OK`
- `OK con observaciones`
- `FAIL`

## 7. Criterio final de aceptacion

El sistema puede considerarse aceptado cuando:

- no hay fallos criticos abiertos
- las salas y estados se muestran correctamente
- la trazabilidad no se degrada
- el sistema se recupera tras reinicio y backup basico
- el flujo operativo diario es usable
- la documentacion y anexos son aplicables en campo
