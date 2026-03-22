# Guia de Operacion

## 1. Objetivo

Esta guia describe como usar la aplicacion en operacion diaria, incluyendo la capa de monitorizacion IoT por sala y la gestion operativa de alertas.

## 2. Flujo general

El sistema opera en 6 fases:

1. Genetica
2. Madre
3. Clon
4. Vegetativo
5. Floracion
6. Cosecha

Adicionalmente, la app incluye una pestaña de `Labores` para checklist operativa diaria por turno.

La operacion diaria puede incorporar tambien contexto IoT por sala para:

- supervision ambiental
- deteccion de alertas
- revision de frescura de datos
- interpretacion de incidencias desde el visor QR

La app dispone de una pestaña especifica `Datos IoT` para operacion ambiental por sala.

La app dispone tambien de una pestaña `Asistente` para consultas documentales y operativas.

## 2.1 Roles operativos

La app distingue estos perfiles:

- `Operario`: altas, etiquetado, visor QR y labores operativas
- `Calidad`: visor QR, geneticas, labores y auditoria
- `Dirección Cultivo`: supervision general, auditoria y acciones de coordinacion
- `Técnico Sistema`: sincronizacion, backups, conflictos y mantenimiento

El acceso actual se realiza mediante seleccion de usuario local al entrar en la app. El rol asociado al usuario modifica las vistas y acciones disponibles en la interfaz.

Resumen práctico:

- `Operario`: trabajo diario, altas, etiquetado, visor y auditoría operativa
- `Calidad`: revisión, auditoría y trazabilidad
- `Dirección Cultivo`: supervisión, validación y decisiones operativas
- `Técnico Sistema`: sincronización, backups, conflictos y mantenimiento

## 3. Alta de nuevas entidades

Entrar en la seccion `Pasaporte`.

### 3.0 Alta de genetica base

- abrir la pestaña `GENÉTICA`
- introducir `Variedad`
- completar, si aplica, `Linaje`, `Imagen URL`, `Documentos URL`, `Quimiotipo`, `Cannabinoides URL`, `Terpenos URL` y `Notas`
- el sistema genera una ID base autoderivada de la variedad
- guardar
- la genetica queda disponible inmediatamente en `Genéticas`, `Etiquetado`, `Visor QR` y altas de madre

### 3.1 Alta de madre

- seleccionar genetica
- la ID se genera con las 3 primeras letras de la genetica en mayusculas
- la ubicacion se rellena por defecto como `Sala de Madres`
- indicar fecha
- guardar
- el sistema genera la ID automaticamente
- la sala IoT asociada es `Sala de Madres`

### 3.2 Alta de clon

- seleccionar madre origen
- indicar fecha y cantidad
- guardar
- la sala IoT asociada es `Sala de Clones`

### 3.3 Alta de vegetativo

- seleccionar clon origen
- la ubicacion se rellena por defecto como `Sala de Vegetativos`
- indicar fecha y cantidad
- guardar
- la sala IoT resuelta debe mapearse a `Sala de Vegetativo`

### 3.4 Alta de floracion

- seleccionar vegetativo origen
- indicar ubicacion y fecha
- guardar
- la sala IoT asociada debe resolverse a `Sala de Floración`

### 3.5 Alta de cosecha

- seleccionar floracion origen
- indicar fecha, peso humedo, peso seco y ubicacion
- guardar
- si el lote entra en almacenamiento, la sala IoT asociada debe resolverse a `Almacén Cosecha`

## 3.6 Monitorizacion IoT por sala

La app trabaja con estas salas IoT cerradas:

- `Sala de Clones`
- `Sala de Madres`
- `Sala de Vegetativo`
- `Sala de Floración`
- `Almacén Cosecha`

Las salas de cultivo muestran:

- `T`
- `H`
- `VPD`
- `DLI`
- `T sustrato`
- `EC`
- `pH`

`Almacén Cosecha` solo muestra:

- `T`
- `H`

## 4. Etiquetado

Entrar en `Etiquetado`.

- buscar el nodo por ID o variedad
- seleccionar el nodo
- imprimir la etiqueta QR

El QR abre el visor visual del nodo.

## 4.1 Labores

La pestaña `Labores` funciona como checklist diario por fecha y turno.

Características:

- persistencia local por navegador
- progreso global del turno
- progreso por bloque
- bloques visibles según rol
- roles recomendados por bloque de trabajo

## 5. Visor QR

Entrar en `Visor QR` o escanear el QR directamente.

La ficha visual muestra:

- imagen
- ID
- tipo
- estado de sincronizacion
- datos de la fila
- origen inmediato
- ruta completa
- historial del nodo
- contexto IoT de la sala asociada si existe
- alertas activas de la sala

Si se entra desde QR en movil, la ficha se abre en modo standalone y oculta navegacion general, buscador manual, historial del nodo y controles de edicion.

## 6. Edicion local

Si un nodo esta `Sincronizado`, se pueden editar campos seguros.

Campos tipicos:

- `Ubicación`
- `Estado`
- `Cantidad`
- `Fecha`
- `Fecha Cosecha`
- `Peso Húmedo (g)`
- `Peso Seco (g)`
- `Notas`

Si cambia `Ubicación`, cambia tambien la sala IoT desde la que el nodo hereda contexto ambiental.

## 6.1 Dashboard IoT y estados

El dashboard puede mostrar el estado de cada sala con estas clasificaciones:

- `OK`
- `WARNING`
- `ALARM`
- `STALE`
- `OFFLINE`

Interpretacion rapida:

- `OK`: dentro de objetivo y con telemetria fresca
- `WARNING`: desviacion moderada o sostenida
- `ALARM`: desviacion critica o combinacion de riesgo
- `STALE`: datos antiguos
- `OFFLINE`: sala sin telemetria operativa suficiente

## 6.2 Alertas IoT

Las alertas pueden reflejar:

- temperatura alta o baja
- humedad alta o baja
- VPD fuera de rango
- DLI fuera de rango
- EC o pH fuera de rango
- dato stale
- broker o gateway offline

Prioridades operativas:

- `Sala de Floración`: prioridad alta
- `Almacén Cosecha`: prioridad alta

## 6.3 Pestaña Datos IoT

La pestaña `Datos IoT` permite:

- ver estado actual de todas las salas
- revisar alertas activas
- reconocer alertas (`ack`)
- cerrar alertas con observacion manual
- consultar historico por sala en ventanas `24h`, `7d` y `30d`
- exportar historico IoT por sala en `JSON` y `CSV`
- exportar historico de alertas en `CSV`

Campos operativos visibles:

- desviacion detectada
- explicacion humana
- valores observados frente a objetivo
- referencia SOP aplicable
- actor que reconoce o cierra la alerta

## 6.4 Historico IoT

Dentro de `Datos IoT`:

- seleccionar la sala
- seleccionar ventana temporal
- revisar mini graficas por metrica
- comprobar si el valor esta `En objetivo`, `Bajo objetivo` o `Sobre objetivo`

La banda visual verde representa el rango objetivo de la politica activa.

## 6.5 Gestion manual de alertas

Desde `Datos IoT`:

- `Reconocer`: deja la alerta como revisada por un usuario
- `Cerrar alerta`: solicita observacion de cierre y registra el actor

El historico conserva:

- inicio y fin
- usuario que reconoce
- usuario que cierra
- observacion de cierre

## 6.6 Pestaña Asistente

La pestaña `Asistente` permite:

- preguntar por SOPs aplicables
- preguntar por rangos operativos
- pedir resumen de una sala
- pedir contexto de un lote o QR concreto
- consultar documentacion validada indexada

Comportamiento esperado:

- si encuentra evidencia en SOPs, manuales, PDFs o `validated_info/`, responde con fuentes
- si no encuentra base suficiente, indica que no puede responder con seguridad

La pestaña permite introducir:

- sala
- QR o lote opcional
- pregunta libre o preguntas rápidas

## 7. Sincronizacion

En el dashboard existe un panel de sincronizacion.

Permite:

- ver operaciones pendientes
- reintentar
- descartar
- resolver conflictos
- exportar backup
- importar backup

Estas acciones deben estar reservadas a `Dirección Cultivo` y `Técnico Sistema`.

## 8. Resolucion de conflictos

Si aparece un conflicto, se puede:

- `Mantener local`
- `Mantener remoto`

## 9. Auditoria

La seccion `Auditoría` muestra:

- escaneos
- altas
- ediciones
- sincronizaciones
- errores
- conflictos
- restauraciones

Los eventos nuevos de auditoria muestran tambien actor y rol del usuario cuando la accion se lanza desde la interfaz.

La auditoria global completa debe estar orientada principalmente a `Calidad`, `Dirección Cultivo` y `Técnico Sistema`, aunque `Operario` puede visualizar una version operativa en la interfaz actual.

Permite filtrar y exportar historial.

Los eventos nuevos pueden mostrar:

- actor
- rol
- nodo
- hoja
- fecha/hora

## 10. Revisión diaria IoT recomendada

Por turno se recomienda:

1. abrir la pestaña `Datos IoT`
2. comprobar ultima lectura por sala
3. revisar `Sala de Floración`
4. revisar `Almacén Cosecha`
5. revisar alertas activas
6. revisar historico si la incidencia requiere contexto
7. documentar incidencias tecnicas u operativas si procede

Para procedimiento formal y registros GACP, seguir `SOP_IOT_001_Monitorizacion_IoT_GACP.md`.
