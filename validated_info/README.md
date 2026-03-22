# Informacion Validada

Coloca aqui documentacion validada que quieras incorporar al sistema RAG del `S1 Chat-Agent`.

Tipos soportados:

- `.md`
- `.txt`
- `.pdf`
- `.json`

Ejemplos de uso:

- SOPs adicionales validados
- manuales internos
- informes tecnicos aprobados
- fichas de geneticas
- documentos regulatorios o de calidad
- plantillas textuales validadas para PDFs con mala extraccion, por ejemplo `RNCP` o `Terpenos`

## Comportamiento

- el backend indexa automaticamente esta carpeta al arrancar
- tambien puedes forzar reindexado con:

```bash
curl -X POST http://localhost:3001/api/agents/chat/reindex
```

## Importante

- solo sube informacion validada
- no subas secretos ni credenciales
- si la respuesta no aparece en esta documentacion ni en los SOPs/manuales indexados, el asistente debe responder que no encuentra base suficiente

## Plantillas incluidas

- `TEMPLATE_GENETICA_TERPENOS.md`
- `TEMPLATE_GENETICA_RNCP.md`

Recomendacion de uso:

- copiar la plantilla
- renombrarla con el nombre de la genetica, por ejemplo:
  - `PACHAMAMA_Terpenos.md`
  - `PACHAMAMA_RNCP.md`
- completar solo con informacion validada
- reindexar el asistente con:

```bash
curl -X POST http://localhost:3001/api/agents/chat/reindex
```
