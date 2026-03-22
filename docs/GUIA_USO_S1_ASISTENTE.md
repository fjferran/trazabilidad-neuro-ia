# Guia de Uso del Agente S1

## 1. Objetivo

Esta guia explica como utilizar el agente `S1 Chat-Agent` dentro de la app `Neuro-IA Trazabilidad` para consultar SOPs, manuales, documentacion validada, contexto IoT por sala y contexto de lotes o QR.

`S1` funciona como un asistente documental y operativo. Su finalidad es ayudar a interpretar la informacion disponible sin salir de la app.

## 2. Donde se usa

El agente `S1` se utiliza en la pestaña:

- `Asistente`

URL habitual del sistema en el Mini PC:

- `http://192.168.0.100:3001`

## 3. Que informacion consulta

El agente recupera informacion desde estas fuentes:

- `SOP_Trazabilidad_Neuro-IA.md`
- `SOP_IOT_001_Monitorizacion_IoT_GACP.md`
- `SOP_S1_001_Agente_Asistente_RAG.md`
- documentacion de `docs/`
- PDFs en `traza_argentina/`
- carpeta `validated_info/`
- estado IoT actual de la sala seleccionada
- contexto de lote o QR si se proporciona

## 4. Como usarlo

1. abrir la pestaña `Asistente`
2. seleccionar una sala
3. introducir opcionalmente un `QR / lote`
4. escribir una pregunta o pulsar una pregunta rapida
5. pulsar `Preguntar`

## 5. Tipos de preguntas recomendadas

### 5.1 Estado de sala

- `Resume el estado actual de la Sala de Clones.`
- `Explica la alerta activa de la sala seleccionada.`
- `Que debo revisar primero si la sala está en ALARM?`

### 5.2 SOPs y procedimiento

- `Que SOP aplica a la desviacion detectada en la sala seleccionada?`
- `Que dice el SOP sobre humedad en clones?`

### 5.3 Lotes y QR

- `Resume el contexto IoT del lote PAC-PM-1-26-CL-1.`
- `Que alertas afectan al QR indicado?`

### 5.4 Documentacion validada

- `Que documentacion validada existe para la genetica PACHAMAMA?`
- `Que dice la documentacion sobre EC y pH en floración?`

### 5.5 Validacion de conocimiento

- `No encuentro respuesta en los documentos, puedes indicarme si falta informacion validada?`

## 6. Buenas practicas

- hacer preguntas concretas y orientadas a una sala o proceso
- seleccionar la sala antes de consultar sobre desviaciones
- introducir el `QR / lote` cuando la consulta sea sobre un nodo concreto
- revisar siempre las fuentes que devuelve el agente
- si la respuesta afecta una decision crítica, contrastarla con QA o Direccion de Cultivo

## 7. Como responde el agente

La respuesta puede incluir:

- respuesta principal
- recomendaciones operativas
- fuentes utilizadas
- nivel de confianza

Si no encuentra base suficiente, el agente debe indicar expresamente que no puede responder con seguridad.

## 8. Modo RAG y modo RAG + LLM

`S1` puede operar de dos formas:

### 8.1 RAG extractivo estricto

- usa solo recuperacion documental
- no intenta redactar con modelo externo
- si no encuentra evidencia suficiente, lo indica

### 8.2 RAG + LLM

- usa un modelo LLM con contexto recuperado
- sigue instruccion estricta de no alucinar
- la clave se configura solo en el Mini PC mediante `systemd`

## 9. Reindexado de documentos

Si se anaden documentos nuevos en `validated_info/`, puede forzarse el reindexado:

```bash
curl -X POST http://192.168.0.100:3001/api/agents/chat/reindex
```

Comprobacion de salud del asistente:

```bash
curl http://192.168.0.100:3001/api/agents/chat/health
```

## 10. Limites del agente

- no sustituye el criterio tecnico o agronomico
- no debe inventar valores ni SOPs
- no modifica datos de trazabilidad o IoT
- no actua sobre hardware
- no sustituye la revision QA cuando se trate de decisiones criticas

## 11. Recomendacion operativa final

Usa `S1` como asistente de interpretacion y localizacion documental. Para acciones criticas:

- revisar la fuente mostrada
- contrastar con el SOP aplicable
- confirmar la situacion fisica en sala si hay una alerta activa
