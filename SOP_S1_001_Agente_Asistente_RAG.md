# Procedimiento Operativo Estandar (SOP)

## Uso del Agente S1 Asistente RAG

| Empresa: Neuro-IA | Codigo: SOP-S1-001 | Version: 1.0 |
| --- | --- | --- |
| **Titulo:** Uso del Agente S1 Asistente RAG | **Fecha Vigor:** 22/03/2026 | **Paginas:** 1 de 1 |

---

### 1. Objetivo y Proposito

Definir el uso operativo del agente `S1 Chat-Agent` para consulta documental y contextual sobre trazabilidad, IoT, SOPs, geneticas y documentacion validada.

El agente `S1` debe:

- responder usando solo informacion recuperada del contexto operativo y documental indexado
- citar fuentes cuando sea posible
- declarar que no puede responder con seguridad si no encuentra base suficiente
- no inventar valores, SOPs, rangos ni recomendaciones no sustentadas

---

### 2. Fuentes permitidas del agente S1

El agente puede recuperar informacion desde:

- `SOP_Trazabilidad_Neuro-IA.md`
- `SOP_IOT_001_Monitorizacion_IoT_GACP.md`
- `docs/`
- `traza_argentina/`
- `validated_info/`
- contexto IoT por sala
- contexto de lote/QR cuando se indique

---

### 3. Reglas de uso

- seleccionar sala antes de preguntar por desviaciones o estado ambiental
- indicar QR o lote si la consulta es sobre un nodo concreto
- revisar siempre las fuentes devueltas por el agente
- si el agente no encuentra base suficiente, no debe forzarse una respuesta operativa

---

### 4. Conjunto de 10 preguntas recomendadas

Las siguientes preguntas pueden documentarse y usarse como ejemplos operativos oficiales del agente `S1`:

1. `Resume el estado actual de la Sala de Clones.`
2. `Explica la alerta activa de la Sala de Floración.`
3. `Que SOP aplica a la desviacion detectada en la sala seleccionada?`
4. `Que significa que haya estres hidrico en clones?`
5. `Que rango de humedad se recomienda para clones y que ocurre si está por debajo?`
6. `Que debo revisar primero si la sala está en ALARM?`
7. `Resume el contexto IoT del lote <ID-QR>.`
8. `Que documentacion validada existe para la genetica <VARIEDAD>?`
9. `Que dice la documentacion sobre EC y pH en floración?`
10. `No encuentro respuesta en los documentos, puedes indicarme si falta informacion validada?`

---

### 5. Uso recomendado por tipo de consulta

- **Estado de sala**
  - usar preguntas 1, 2 y 6
- **Interpretacion agronomica**
  - usar preguntas 4 y 5
- **SOP y cumplimiento**
  - usar pregunta 3
- **Trazabilidad + IoT**
  - usar pregunta 7
- **Geneticas y documentacion validada**
  - usar preguntas 8 y 9
- **Control de calidad del conocimiento**
  - usar pregunta 10

---

### 6. Criterio de aceptacion de la respuesta

Una respuesta del agente `S1` se considera aceptable cuando:

- usa informacion recuperada del contexto o de documentos indexados
- no contradice SOPs o politicas activas
- aporta fuentes o contexto identificable
- no inventa informacion si no hay evidencia suficiente

---

### 7. Referencias

- `README.md`
- `docs/TRAZABILIDAD_IOT_AGENTES_ARQUITECTURA.md`
- `SOP_Trazabilidad_Neuro-IA.md`
- `SOP_IOT_001_Monitorizacion_IoT_GACP.md`
- `validated_info/`
