# Diseno de Arquitectura IoT y Agentes Especializados para Trazabilidad Digital

## 1. Proposito del documento

Este documento define la arquitectura funcional y tecnica para integrar una capa IoT local y tres agentes especializados dentro de `Neuro-IA Trazabilidad`.

Su objetivo es complementar la trazabilidad digital existente con:

- monitorizacion ambiental y de fertirriego por sala
- analitica operativa sobre telemetria
- gestion de incidencias y alarmas
- asistencia conversacional basada en SOPs y contexto operativo

Este documento no sustituye la arquitectura actual de trazabilidad. La extiende con un subsistema IoT desacoplado, orientado a operacion local, auditabilidad y soporte a decision.

## 2. Objetivo del sistema IoT + agentes

El sistema IoT + agentes debe:

- capturar telemetria local desde `gateway/ESP/MQTT`
- almacenar historico y estado actual en base local `SQLite`
- relacionar el estado IoT con los nodos de trazabilidad mediante la sala donde se ubican
- clasificar condiciones operativas en `OK`, `WARNING`, `ALARM`, `STALE` u `OFFLINE`
- mostrar informacion contextual en `Dashboard` y `Visor QR`
- ofrecer un asistente conversacional interno a la app web
- mantener un enfoque `local-first`, sin depender de Google Sheets para la telemetria cruda

## 3. Alcance funcional

El alcance inicial incluye las siguientes salas:

- `Sala de Clones`
- `Sala de Madres`
- `Sala de Vegetativo`
- `Sala de Floracion`
- `Almacen Cosecha`

Variables monitorizadas:

- salas de cultivo:
  - `Temperatura`
  - `Humedad`
  - `VPD`
  - `DLI`
  - `Temperatura de sustrato`
  - `EC`
  - `pH`
- almacen cosecha:
  - `Temperatura`
  - `Humedad`

El alcance inicial no incluye:

- actuacion automatica sobre hardware
- integracion con `WhatsApp`, `Telegram` o canales externos
- almacenamiento de series IoT en Google Sheets
- control autonomo sin supervision humana

Nota de evolucion:

- el sistema ya dispone de una capa inicial de actuadores Shelly por IP con control manual y automatizacion condicionada, siempre bajo configuracion explicita y sin autonomia no supervisada por defecto

## 4. Principios de diseno

La arquitectura se basa en estos principios:

- separacion estricta entre trazabilidad e IoT
- vinculacion por `sala`, no por lote individual
- persistencia local independiente y auditable
- agentes con responsabilidad separada
- fuente unica de politicas por sala
- compatibilidad con operativa offline
- facilidad de extension futura sin reescribir la base del sistema

## 5. Arquitectura general en capas

La arquitectura se organiza en las siguientes capas:

### 5.1 Capa fisica

Incluye sensores, sondas, gateways y microcontroladores ESP desplegados en cada sala.

### 5.2 Capa IoT local

Incluye broker MQTT local y la logica de publicacion de telemetria por topic.

### 5.3 Capa de orquestacion backend

La aplica el backend Node/Express actual, ampliado con:

- consumidor MQTT
- normalizacion de payloads
- persistencia `SQLite`
- evaluacion de politicas
- generacion de snapshots y alertas
- control de actuadores Shelly por IP
- automatizacion condicionada por metrica, duracion y cooldown
- automatizacion por horario y pulsos temporizados
- interpretacion guiada de reglas de actuadores en lenguaje natural

### 5.4 Capa de datos

Incluye la base IoT local `SQLite`, separada del `local_mirror` de trazabilidad.

### 5.5 Capa de politicas

Incluye thresholds, reglas de persistencia, combinaciones de riesgo y reglas de frescura, versionadas por sala.

La fuente tecnica viva de esta capa queda externalizada en archivos versionados del backend:

- `server/iot-policies.json`
  - thresholds por sala
  - reglas `warning` y `alarm`
  - politicas de frescura
  - reglas combinadas
- `server/iot-anomalies.json`
  - etiquetas humanas de anomalias
  - explicaciones operativas
  - referencias documentales a SOP

Los SOP documentan y respaldan estas reglas, pero la logica en runtime se aplica desde dichos archivos JSON.

### 5.6 Capa de agentes

Incluye tres servicios logicos:

- `S1 Chat-Agent`
- `S2-IoT Agent`
- `S2-E Emergency Agent`

### 5.7 Capa API

Expone endpoints REST para frontend y consultas contextuales.

Incluye tambien endpoints de actuacion controlada para relés Shelly.

### 5.8 Capa UI web

Integra los resultados en:

- `Dashboard`
- `SearchView`
- futura vista `Asistente`
- `Actuadores`

### 5.9 Perfiles de hardware soportados

#### 5.9.1 Perfil de produccion estable: Mini PC con Proxmox

Es la arquitectura principal recomendada para explotacion estable.

Especificacion orientativa:

- CPU `Intel N100/N305` o `Intel Core i5` de bajo consumo
- `16 GB RAM` minimo, `32 GB` recomendado
- `NVMe SSD 512 GB` minimo, `1 TB` recomendado
- red `Gigabit`
- `UPS`

Ventajas:

- mejor soporte real para `Proxmox`
- mayor margen para `MQTT`, backend, `SQLite`, backups y observabilidad
- mejor escalabilidad futura

#### 5.9.2 Perfil de despliegue compacto: Raspberry Pi 5

Es una arquitectura alternativa soportada para piloto avanzado, edge compacto o sede secundaria.

Especificacion orientativa:

- `Raspberry Pi 5`
- `8 GB RAM`
- `SSD externo/NVMe 256-512 GB`
- refrigeracion activa
- `UPS` pequeno opcional

Ventajas:

- menor coste y consumo
- despliegue compacto

Limitaciones:

- menor margen para virtualizacion pesada
- menor holgura de disco y memoria frente al perfil principal

## 6. Integracion con la trazabilidad existente

La trazabilidad actual permanece como sistema principal de nodos, fases y relaciones de linaje.

La integracion se realiza asi:

- cada nodo ya contiene `Ubicacion`
- esa `Ubicacion` se resuelve contra un catalogo cerrado de salas IoT
- la app consulta el snapshot y alertas de la sala correspondiente
- el resultado se presenta como contexto operacional del lote o nodo

Esto evita alterar el modelo principal basado en Google Sheets y `local_mirror`.

## 7. Modelo operativo por salas

El sistema adopta un catalogo cerrado de salas:

- `Sala de Clones`
- `Sala de Madres`
- `Sala de Vegetativo`
- `Sala de Floracion`
- `Almacen Cosecha`

Toda `Ubicacion` operativa debe resolverse hacia una de estas salas mediante una funcion de mapeo controlada.

`Almacen Cosecha` tiene tratamiento especial y solo soporta:

- `Temperatura`
- `Humedad`

## 8. Variables monitorizadas y reglas por sala

La referencia operativa en runtime para esta seccion se mantiene en `server/iot-policies.json`.

### 8.1 Sala de Clones

- `T`: 24-26 C objetivo
- `H`: 75-85 % objetivo
- `VPD`: 0.4-0.8 kPa
- `DLI`: 6-12 mol/m2/d
- `T sustrato`: 22-24 C
- `EC`: 0.4-0.8 mS/cm
- `pH`: 5.8-6.2

### 8.2 Sala de Madres

- `T`: 24-28 C
- `H`: 55-70 %
- `VPD`: 0.8-1.2 kPa
- `DLI`: 20-30 mol/m2/d
- `T sustrato`: 20-24 C
- `EC`: 1.2-2.0 mS/cm
- `pH`: 5.8-6.3

### 8.3 Sala de Vegetativo

- `T`: 24-28 C
- `H`: 60-75 %
- `VPD`: 0.8-1.2 kPa
- `DLI`: 20-35 mol/m2/d
- `T sustrato`: 20-24 C
- `EC`: 1.2-1.8 mS/cm
- `pH`: 5.8-6.2

### 8.4 Sala de Floracion

- `T`: 22-26 C
- `H`: 45-60 %
- `VPD`: 1.0-1.4 kPa
- `DLI`: 30-45 mol/m2/d
- `T sustrato`: 20-23 C
- `EC`: 1.4-2.2 mS/cm
- `pH`: 5.8-6.3

### 8.5 Almacen Cosecha

- `T`: 15-21 C
- `H`: 45-55 %

Ademas, se definen:

- umbrales `warning`
- umbrales `alarm`
- persistencia minima por numero de lecturas consecutivas
- reglas especiales por combinacion de variables
- reglas de frescura y sensor offline

## 9. Arquitectura de datos IoT

El subsistema IoT usa las siguientes entidades:

- `iot_rooms`
- `iot_devices`
- `iot_readings`
- `iot_room_snapshots`
- `iot_alerts`
- `iot_policy_profiles`
- `agent_runs`

Las lecturas crudas se almacenan para historico. Los snapshots almacenan el ultimo estado consolidado por sala. Las alertas conservan trazabilidad de incidencias activas e historicas.

## 10. Persistencia local SQLite

La base IoT local se implementa en `SQLite` por:

- simplicidad de despliegue
- buena compatibilidad con entorno local
- soporte adecuado para historico de telemetria
- facilidad de backup y restauracion

Tablas principales:

- `iot_rooms`: catalogo maestro de salas
- `iot_devices`: inventario de dispositivos y gateways
- `iot_readings`: historico de lecturas normalizadas
- `iot_room_snapshots`: ultimo estado rapido por sala
- `iot_alerts`: alertas abiertas, reconocidas y resueltas
- `iot_policy_profiles`: thresholds y reglas versionadas
- `agent_runs`: auditoria de ejecuciones de agentes

Los snapshots existen para evitar recalculo constante en `Dashboard` y `SearchView`.

Las tablas `iot_policy_profiles` conservan una representacion persistida de la politica activa, pero el origen de verdad del despliegue queda en `server/iot-policies.json` y se carga al inicializar el sistema.

## 11. Ingesta MQTT y normalizacion

La telemetria llegara a traves de un broker MQTT local.

Topics propuestos:

- `trazabilidad/iot/sala/clones`
- `trazabilidad/iot/sala/madres`
- `trazabilidad/iot/sala/vegetativo`
- `trazabilidad/iot/sala/floracion`
- `trazabilidad/iot/sala/almacen-cosecha`

Payload esperado:

- `deviceId`
- `timestamp`
- `metrics`

El backend debe:

- suscribirse a topics
- validar esquema
- validar tipos
- validar timestamp
- validar rangos fisicos minimos
- normalizar nombres de metricas
- persistir lectura resultante

Lecturas invalidas no deben alimentar los agentes como si fueran datos correctos.

## 12. Motor de politicas y clasificacion

El motor de politicas es la fuente unica de verdad para evaluar el estado de cada sala.

Estados posibles:

- `OK`
- `WARNING`
- `ALARM`
- `STALE`
- `OFFLINE`

El motor evalua:

- rango objetivo
- warning
- alarm
- persistencia
- frescura
- conflicto entre sensores
- perdida de dispositivo o gateway
- combinaciones de riesgo

Este motor alimenta directamente a `S2-IoT` y `S2-E`.

La capa de clasificacion utiliza como base:

- `server/iot-policies.json` para rangos, frescura y combinaciones
- `server/iot-anomalies.json` para lenguaje humano y referencias documentales

Por diseno, cualquier cambio aprobado de politica debe reflejarse en estos archivos para que la app y el backend apliquen la nueva regla en runtime.

## 13. Diseno de agentes especializados

### 13.1 S1 Chat-Agent

Funcion:

- responder preguntas operativas sobre trazabilidad, SOPs e IoT
- interpretar alertas
- dar guidance contextual
- citar fuentes

Entradas:

- pregunta
- rol del usuario
- contexto opcional de sala o QR
- resumen IoT
- alertas activas
- fuentes documentales

Salidas:

- respuesta natural
- fuentes
- recomendaciones
- nivel de confianza
- bandera de revision humana si aplica

Restricciones:

- no actua sobre hardware
- no modifica datos
- solo asesora

Implementacion actual:

- vista `Asistente` en la app web
- endpoint `POST /api/agents/chat`
- endpoint `GET /api/agents/chat/health`
- endpoint `POST /api/agents/chat/reindex`
- recuperacion documental local sobre SOPs, manuales, PDFs y carpeta `validated_info/`
- modo estricto sin alucinacion cuando no hay evidencia suficiente

Fuente documental indexada:

- `README.md`
- SOPs
- `docs/`
- `traza_argentina/`
- `validated_info/`

Operacion del RAG:

- sin `OPENAI_API_KEY`: respuesta extractiva estricta con contexto recuperado
- con `OPENAI_API_KEY`: respuesta con LLM condicionado por el contexto documental recuperado
- en ambos casos, si no hay base suficiente, el agente debe declarar que no puede responder con seguridad

Despliegue actual:

- el Mini PC ya ejecuta el backend con indice RAG operativo
- la clave `OPENAI_API_KEY` debe inyectarse via override de `systemd`
- no debe persistirse en codigo, JSON ni documentacion versionada

### 13.2 S2-IoT Agent

Funcion:

- resumir telemetria por sala
- calcular y validar indicadores
- clasificar estado operativo
- detectar anomalias
- proponer acciones de bajo nivel operativo

Entradas:

- sala
- ventana temporal
- series validadas
- politica activa
- estado de sensores

Salidas:

- `classification`
- `summary`
- `metrics`
- `anomalies`
- `recommendedActions`
- `dataQuality`

### 13.3 S2-E Emergency Agent

Funcion:

- evaluar eventos criticos
- asignar severidad
- recomendar respuesta inmediata
- forzar escalado humano si corresponde

Entradas:

- sala
- telemetria actual
- politica activa
- frescura
- salud de sensores
- estado de broker/gateway

Salidas:

- `severity`
- `status`
- `alarmCode`
- `reason`
- `immediateActions`
- `escalateTo`
- `operatorAckRequired`

Restriccion inicial:

- no ejecuta acciones automaticas sobre hardware

## 14. Contratos API

### 14.1 S1

- `POST /api/agents/chat`
- `GET /api/agents/chat/health`
- `POST /api/agents/chat/reindex`

### 14.2 S2-IoT

- `GET /api/agents/iot/rooms/:room/status`
- `GET /api/agents/iot/rooms/:room/summary`
- `GET /api/agents/iot/rooms/:room/history`

### 14.3 S2-E

- `POST /api/agents/emergency/evaluate`
- `GET /api/agents/emergency/active`
- `GET /api/agents/emergency/history`

### 14.4 Extensiones de API existente

- `GET /api/search/:qr`
- `GET /api/trace/:qr`
- `GET /api/health`
- backup/restore extendido con bloque IoT

Todos los contratos deben mantener:

- `status`
- `generatedAt`
- `traceId`

### 14.5 Actuadores

- `GET /api/actuators`
- `POST /api/actuators/reload`
- `POST /api/actuators/:id/on`
- `POST /api/actuators/:id/off`
- `POST /api/actuators/:id/automation`
- `POST /api/actuators/automation/parse`
- `POST /api/actuators/automation/apply`

La configuracion persistente de actuadores se mantiene en `server/actuators.json`.

Modos soportados actualmente:

- `metric`
- `schedule`
- `pulse`

## 15. Integracion en frontend

### 15.1 Dashboard

Debe mostrar:

- tarjetas por sala
- estado actual
- metrica clave
- frescura de datos
- alertas activas
- resumen del agente IoT
- acceso rapido al asistente

### 15.2 SearchView

Debe mostrar:

- sala actual del nodo
- ultima lectura IoT de la sala
- resumen del agente IoT
- banner de alerta si existe
- acceso al asistente contextual

### 15.3 Asistente

Debe permitir:

- preguntas abiertas
- preguntas contextuales desde lote o sala
- visualizacion de fuentes
- recomendaciones accionables sin automatizacion

## 16. Alertas, incidencias y escalado

El sistema debe soportar:

- apertura de alerta
- reconocimiento humano
- resolucion
- historico de incidencias

Tipos tipicos:

- temperatura alta o baja
- humedad alta o baja
- VPD fuera de rango
- DLI fuera de rango
- EC o pH fuera de rango
- sensor stale
- gateway offline
- broker offline
- conflicto de sensores

Severidad:

- `low`
- `medium`
- `high`

Las condiciones de `Floracion` y `Almacen Cosecha` deben tener tratamiento de riesgo reforzado.

## 17. Auditoria, backup y recuperacion

Deben registrarse eventos como:

- lectura IoT ingerida
- snapshot actualizado
- alerta abierta
- alerta reconocida
- alerta resuelta
- evaluacion de agente
- respuesta de chat

El backup IoT debe incluir:

- salas
- dispositivos
- politicas
- snapshots
- alertas
- historico segun estrategia definida

La restauracion debe ser consistente con el modelo de trazabilidad existente y no mezclar el espejo local con la base IoT sin separacion explicita.

## 18. Seguridad operativa y gobernanza

La gobernanza del sistema debe asegurar:

- roles y permisos
- aprobacion de thresholds por `Direccion de Cultivo` y `QA`
- trazabilidad de cambios
- no automatizacion en fase 1
- posibilidad de endurecer politicas en fases futuras

El sistema debe evitar:

- actuacion no auditada
- cambios opacos de politica
- uso de datos stale como si fueran actuales
- dependencia de una sola vista sin respaldo historico

## 19. KPIs y validacion

### 19.1 S1

- exactitud de respuesta
- cobertura documental
- nivel de utilidad percibida
- tasa de preguntas con contexto insuficiente

### 19.2 S2-IoT

- exactitud de clasificacion
- latencia de analisis
- estabilidad del estado
- calidad de calculo de indicadores

### 19.3 S2-E

- tiempo a alarma
- precision en eventos criticos
- falsos positivos
- estabilidad entre evaluaciones repetidas

## 20. Roadmap de implementacion

### Fase 1

- catalogo de salas
- SQLite
- MQTT
- almacenamiento de lecturas

### Fase 2

- motor de politicas
- snapshots
- alertas

### Fase 3

- endpoints `S2-IoT` y `S2-E`
- integracion en `search` y `health`

### Fase 4

- `Dashboard`
- `SearchView`
- vista `Asistente`

### Fase 5

- backup
- auditoria
- validacion funcional

### Fase 6

- documentacion final
- SOP IoT GACP
- mejora iterativa de agentes

## 21. Referencias documentales

- `README.md`
- `docs/TRAZABILIDAD_ARQUITECTURA.md`
- `SOP_Trazabilidad_Neuro-IA.md`
- `SOP_IOT_001_Monitorizacion_IoT_GACP.md`
- `server/iot-policies.json`
- `server/iot-anomalies.json`
- runbook de despliegue e infraestructura
- articulo de arquitectura ASA usado como referencia metodologica
