# Esquema de Uso del LLM y de los Agentes

## 1. Objetivo

Este documento explica de forma simple como actua el LLM dentro del sistema y como se separa su uso respecto a la logica determinista de IoT, alertas y actuadores.

## 2. Resumen rapido

El sistema no usa el LLM para gobernar directamente el proceso productivo.

Actualmente:

- `S1` puede usar `RAG + LLM`
- `S2-IoT` no usa LLM
- `S2-E` no usa LLM
- actuadores Shelly no usan LLM para ejecutar acciones

## 3. Donde actua el LLM

El LLM solo actua en el agente:

- `S1 Chat-Agent`

Su funcion es:

- responder preguntas del usuario
- redactar respuestas mas naturales
- sintetizar documentacion recuperada
- apoyar la interpretacion documental y operativa

## 4. Flujo de S1

Flujo actual:

1. el usuario pregunta en la pestaña `Asistente`
2. el backend recibe la consulta en `POST /api/agents/chat`
3. `server/rag.js` recupera contexto documental y operativo
4. si existe `OPENAI_API_KEY`, se llama al LLM con contexto recuperado
5. si no existe la clave, el sistema responde en modo extractivo estricto
6. la respuesta vuelve a la UI con fuentes y nivel de confianza

## 5. Fuentes que usa S1

El contexto de `S1` se construye desde:

- SOPs
- manuales en `docs/`
- PDFs de `traza_argentina/`
- documentos de `validated_info/`
- estado IoT por sala
- alertas activas
- contexto de lote o QR si el usuario lo indica

## 6. Regla principal de seguridad de S1

El LLM no debe inventar informacion.

La regla operativa es:

- si hay base suficiente en la documentacion o el contexto recuperado, responde
- si no hay base suficiente, debe decir que no puede responder con seguridad

## 7. Donde NO actua el LLM

El LLM no toma decisiones de control directo sobre:

- thresholds IoT
- clasificacion `OK / WARNING / ALARM`
- generacion de alertas
- severidad de incidencias
- sincronizacion con Google Sheets
- escritura del espejo local
- ON/OFF de actuadores Shelly
- automatizaciones de riego, luces, ventilacion o humedad

## 8. Como funcionan S2-IoT y S2-E

`S2-IoT` y `S2-E` funcionan con logica determinista.

Sus fuentes de verdad son:

- `server/iot-policies.json`
- `server/iot-anomalies.json`
- `server/iot.js`

Hacen:

- comparacion contra rangos
- deteccion de anomalias
- generacion de alertas
- explicaciones humanas
- referencias SOP

No dependen del LLM para operar.

## 9. Como funcionan los actuadores

Los actuadores Shelly funcionan con:

- configuracion local en `server/actuators.json`
- logica determinista en `server/actuators.js`
- control por IP usando la API Shelly

Modos actuales:

- `metric`
- `schedule`
- `pulse`

El chat de automatizacion actual interpreta instrucciones con un parser programado. La ejecucion final siempre pasa por validacion backend.

## 10. Beneficio de esta separacion

Separar LLM y control operativo aporta:

- mas seguridad
- mas auditabilidad
- menos riesgo de acciones inesperadas
- mejor cumplimiento documental y GACP

## 11. Esquema conceptual

### 11.1 S1

`Usuario -> Asistente -> RAG -> LLM -> respuesta con fuentes`

### 11.2 S2-IoT / S2-E

`Sensores -> MQTT -> backend -> reglas/politicas -> estado/alerta -> UI`

### 11.3 Actuadores

`Usuario o automatizacion -> backend -> validacion -> Shelly ON/OFF`

## 12. Conclusión

El LLM es una capa de consulta e interpretacion en `S1`.

La operacion real del sistema sigue gobernada por reglas programadas, politicas versionadas y servicios deterministas para mantener control, seguridad y trazabilidad.
