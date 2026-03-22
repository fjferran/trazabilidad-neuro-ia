# Procedimiento Operativo Estandar (SOP)

## Monitorizacion IoT de Variables Ambientales y de Fertirriego

| Empresa: Neuro-IA | Codigo: SOP-IOT-001 | Version: 1.0 |
| --- | --- | --- |
| **Titulo:** Monitorizacion IoT de Variables Ambientales y de Fertirriego | **Fecha Vigor:** 21/03/2026 | **Paginas:** 1 de 1 |

---

### 1. Historial de Revisiones

| Version | Fecha | Descripcion del Cambio | Autor |
| --- | --- | --- | --- |
| 1.0 | 21/03/2026 | Creacion inicial del SOP IoT con enfoque GACP, arquitectura local-first y agentes especializados. | Neuro-IA Team |
| 1.1 | 22/03/2026 | Actualizacion de operativa real en Mini PC con broker MQTT autenticado, pestaña `Datos IoT`, historico, exportaciones y gestion manual de alertas. | Neuro-IA Team |

---

### 2. Lista de Distribucion

- **Copia Digital 01**: Direccion de Cultivo.
- **Copia Digital 02**: Responsable de Calidad (QA).
- **Copia Digital 03**: Operarios de sala.
- **Copia Digital 04**: Responsable Tecnico del Sistema.
- **Copia Digital 05**: Responsable de Almacen/Postcosecha.

---

### 3. Objetivo y Proposito

Establecer el procedimiento para la monitorizacion continua, documentada y auditable de variables ambientales y de fertirriego mediante tecnologia IoT en las areas criticas de cultivo y almacenamiento.

Este SOP tiene por objeto:

- asegurar la disponibilidad y confiabilidad de las lecturas IoT
- detectar desviaciones respecto a rangos operativos definidos
- permitir una respuesta rapida y documentada ante incidencias
- integrar la monitorizacion con la trazabilidad digital por sala
- soportar el cumplimiento de principios GACP mediante registros verificables

Los valores incluidos en este SOP constituyen referencias operativas iniciales para cultivo de cannabis y almacenamiento postcosecha y deben ser aprobados y revisados por Direccion de Cultivo y QA.

---

### 4. Alcance

Aplica a las siguientes areas:

- `Sala de Clones`
- `Sala de Madres`
- `Sala de Vegetativo`
- `Sala de Floracion`
- `Almacen Cosecha`

Aplica a:

- sensores y sondas IoT
- dispositivos ESP y gateways
- broker MQTT local
- backend local de gestion IoT
- base local SQLite
- dashboard y visor QR de la app
- agentes `S1`, `S2-IoT` y `S2-E`

No aplica en esta fase a:

- actuacion automatica directa sobre hardware
- notificaciones externas por canales ajenos a la app web
- uso de Google Sheets como almacenamiento de telemetria cruda

---

### 5. Equipo, Software y Recursos

#### 5.1 Hardware

- sensores de temperatura y humedad
- sondas de sustrato
- sondas de EC y pH para fertirriego
- dispositivos ESP o equivalentes
- gateway local
- infraestructura edge soportada:
  - Mini PC con Proxmox como plataforma principal de produccion estable
  - Raspberry Pi 5 como despliegue compacto soportado
- red local operativa
- terminal o equipo de supervision
- sistema de alimentacion estable; se recomienda UPS

#### 5.2 Software

- broker MQTT local
- backend local Node/Express
- base local SQLite
- aplicacion Neuro-IA Trazabilidad
- pestaña `Datos IoT` para operacion de sala, historico y alertas
- dashboard web de supervision
- motor de politicas por sala
- agentes `S1`, `S2-IoT` y `S2-E`

#### 5.3 Recursos documentales

- `SOP_Trazabilidad_Neuro-IA`
- documento de arquitectura IoT y agentes
- runbook de despliegue e infraestructura
- `server/iot-policies.json` como fuente tecnica versionada de thresholds y reglas
- `server/iot-anomalies.json` como fuente tecnica versionada de explicaciones y referencias de alarma
- manuales de sensores y sondas
- registros de mantenimiento y calibracion
- registros de incidencias y alertas

---

### 6. Definiciones operativas

- **IoT**: sistema de captura automatica de datos por sensores conectados.
- **Sala IoT**: unidad de monitorizacion ambiental y operativa definida en el sistema.
- **Gateway**: dispositivo que concentra y transmite datos de sensores.
- **Broker MQTT**: servicio local de mensajeria para telemetria.
- **Lectura valida**: lectura con estructura correcta, timestamp coherente y valores consistentes.
- **Snapshot de sala**: ultimo estado consolidado de una sala.
- **Alerta**: desviacion respecto a condiciones objetivo que requiere revision o accion.
- **Incidencia critica**: condicion con riesgo elevado para producto, proceso o integridad del sistema.
- **Dato stale**: dato demasiado antiguo para considerarse operativo.
- **S1 Chat-Agent**: asistente conversacional contextual para SOPs, trazabilidad e interpretacion operativa.
- **S2-IoT Agent**: agente de analisis de telemetria y clasificacion operativa por sala.
- **S2-E Emergency Agent**: agente de evaluacion de emergencias e incidencias criticas.
- **Ack**: reconocimiento humano de una alerta activa.
- **Cierre de alerta**: resolucion manual o automatica de una alerta, con observacion cuando corresponda.
- **Politica activa**: perfil vigente de thresholds, persistencia y reglas combinadas aprobado para una sala.

---

### 7. Salas monitorizadas y variables criticas

#### 7.1 Sala de Clones

- temperatura
- humedad
- VPD
- DLI
- temperatura de sustrato
- EC
- pH

#### 7.2 Sala de Madres

- temperatura
- humedad
- VPD
- DLI
- temperatura de sustrato
- EC
- pH

#### 7.3 Sala de Vegetativo

- temperatura
- humedad
- VPD
- DLI
- temperatura de sustrato
- EC
- pH

#### 7.4 Sala de Floracion

- temperatura
- humedad
- VPD
- DLI
- temperatura de sustrato
- EC
- pH

#### 7.5 Almacen Cosecha

- temperatura
- humedad

En `Almacen Cosecha` no aplican en esta fase:

- VPD
- DLI
- temperatura de sustrato
- EC
- pH

---

### 8. Rangos operativos de referencia por sala

Los rangos de esta seccion deben mantenerse alineados con la fuente tecnica viva del sistema en `server/iot-policies.json`.

#### 8.1 Sala de Clones

- `T`: 24-26 C
- `H`: 75-85 %
- `VPD`: 0.4-0.8 kPa
- `DLI`: 6-12 mol/m2/d
- `T sustrato`: 22-24 C
- `EC`: 0.4-0.8 mS/cm
- `pH`: 5.8-6.2

#### 8.2 Sala de Madres

- `T`: 24-28 C
- `H`: 55-70 %
- `VPD`: 0.8-1.2 kPa
- `DLI`: 20-30 mol/m2/d
- `T sustrato`: 20-24 C
- `EC`: 1.2-2.0 mS/cm
- `pH`: 5.8-6.3

#### 8.3 Sala de Vegetativo

- `T`: 24-28 C
- `H`: 60-75 %
- `VPD`: 0.8-1.2 kPa
- `DLI`: 20-35 mol/m2/d
- `T sustrato`: 20-24 C
- `EC`: 1.2-1.8 mS/cm
- `pH`: 5.8-6.2

#### 8.4 Sala de Floracion

- `T`: 22-26 C
- `H`: 45-60 %
- `VPD`: 1.0-1.4 kPa
- `DLI`: 30-45 mol/m2/d
- `T sustrato`: 20-23 C
- `EC`: 1.4-2.2 mS/cm
- `pH`: 5.8-6.3

#### 8.5 Almacen Cosecha

- `T`: 15-21 C
- `H`: 45-55 %

#### 8.6 Criterios de warning y alarm

Se establecen dos bandas adicionales:

- **Warning**: desviacion moderada respecto al objetivo
- **Alarm**: desviacion severa, persistente o con impacto alto

Los umbrales exactos vigentes se gestionan en el perfil de politicas activo por sala y deben mantenerse alineados con el Anexo II.

Todo cambio aprobado por Direccion de Cultivo y QA debe actualizar:

- este SOP
- `server/iot-policies.json`
- si afecta al lenguaje de alarmas, tambien `server/iot-anomalies.json`

---

### 9. Arquitectura del sistema IoT

La arquitectura operativa se compone de:

- sensores y sondas por sala
- dispositivos ESP o equivalentes
- gateway local
- broker MQTT
- backend local de ingesta y validacion
- base SQLite
- motor de politicas
- agentes `S1`, `S2-IoT` y `S2-E`
- interfaz web en dashboard, visor QR y asistente

El sistema es `local-first`. La telemetria se considera gestionada localmente y no depende de Google Sheets para su operacion.

La logica operativa en runtime no se lee directamente desde el SOP. El SOP actua como documento normativo y debe permanecer alineado con los archivos tecnicos versionados del sistema.

---

### 10. Procedimiento operativo diario

#### 10.1 Inicio de turno

El operario o responsable debe:

- abrir el dashboard operativo
- comprobar que todas las salas presentan una lectura reciente
- revisar el estado global de cada sala
- verificar si existen alertas activas

#### 10.2 Revision por sala

Para cada sala, se debe verificar:

- timestamp de ultima lectura
- estado actual `OK`, `WARNING`, `ALARM`, `STALE` u `OFFLINE`
- metricas visibles principales
- alertas activas y recomendaciones asociadas
- historico de la ventana operativa seleccionada (`24h`, `7d` o `30d`)
- comparacion visual contra rango objetivo si se utiliza la pestaña `Datos IoT`

#### 10.3 Sala de Floracion

Debe recibir especial atencion en caso de:

- humedad alta sostenida
- VPD bajo sostenido
- combinacion de temperatura alta y humedad alta

#### 10.4 Almacen Cosecha

Debe recibir especial atencion en caso de:

- humedad superior al rango objetivo
- temperatura superior al rango objetivo
- perdida de telemetria o stale data

#### 10.5 Cierre de turno

Antes del cierre del turno se debe:

- revisar incidencias activas no cerradas
- confirmar que no quedan salas sin datos recientes
- dejar observaciones si hubo desviaciones significativas
- reconocer o cerrar alertas resueltas indicando observacion de cierre cuando proceda

---

### 11. Gestion de alarmas, incidencias y desviaciones

#### 11.1 Tipos de evento

- fuera de rango ambiental
- fuera de rango de fertirriego
- dato stale
- sensor offline
- gateway offline
- broker offline
- conflicto entre sensores
- payload invalido

#### 11.2 Clasificacion operativa

- `OK`: dentro de objetivo y con datos frescos
- `WARNING`: fuera del objetivo pero sin severidad critica
- `ALARM`: desviacion critica, persistente o con impacto alto
- `STALE`: datos antiguos no fiables para operacion
- `OFFLINE`: ausencia de flujo operativo o fallo de conexion

#### 11.3 Respuesta

Ante una alerta o incidencia, se debe:

- confirmar la lectura o fallo
- revisar si la incidencia es tecnica o agronomica
- ejecutar la accion correctiva permitida
- documentar la incidencia si persiste o es critica
- escalar a Direccion de Cultivo y/o QA cuando proceda

Cuando la alerta se gestiona desde la app:

- el reconocimiento debe quedar asociado al usuario que ejecuta el `ack`
- el cierre debe registrar observacion manual si la resolucion requiere evidencia humana
- el historico debe conservar actor, fecha y nota de cierre

#### 11.4 Incidencias criticas

Se consideran especialmente criticas:

- `H` alta sostenida en `Sala de Floracion`
- `H` alta o `T` alta sostenida en `Almacen Cosecha`
- perdida de telemetria prolongada en cualquier sala
- lecturas incoherentes con riesgo de decision equivocada

---

### 12. Integridad de datos, respaldo y trazabilidad

Toda lectura valida debe conservar, como minimo:

- sala
- deviceId
- timestamp observado
- timestamp recibido
- variables medidas
- estado de calidad del dato

El sistema debe permitir:

- historico por sala
- snapshots de estado
- historico de alertas
- historico de reconocimiento y cierre manual de alertas
- backup local
- restauracion documentada

La base IoT debe mantenerse separada del espejo local de trazabilidad.

Las politicas y explicaciones de alarma deben formar parte del control de cambios del sistema y mantenerse versionadas como evidencia tecnica de la configuracion operativa vigente.

---

### 13. Mantenimiento, verificacion y calibracion

#### 13.1 Mantenimiento preventivo

Se debe verificar periodicamente:

- alimentacion y conectividad de sensores
- conectividad del gateway
- disponibilidad del broker MQTT
- consistencia de las lecturas

#### 13.2 Calibracion

Las sondas de EC y pH deben mantenerse bajo procedimiento de verificacion o calibracion segun especificacion del fabricante y criterio de QA.

#### 13.3 Sustitucion o fallo

Si un sensor queda fuera de servicio:

- registrar incidencia
- marcar estado degradado u offline
- evaluar impacto en la operacion
- sustituir o reparar lo antes posible

---

### 14. Responsabilidades

| Rol | Responsabilidad |
| --- | --- |
| **Operario** | Revisar dashboard, detectar alertas, informar incidencias y ejecutar acciones autorizadas. |
| **Responsable QA** | Revisar registros, verificar integridad documental, validar desviaciones y aprobar cambios de criterio. |
| **Direccion de Cultivo** | Definir rangos, interpretar impacto agronomico y tomar decisiones operativas mayores. |
| **Tecnico de Sistema** | Mantener sensores, broker, gateway, backend, base de datos, backup y disponibilidad de la capa IoT. |
| **Responsable de Almacen/Postcosecha** | Supervisar condiciones del Almacen Cosecha y actuar ante desviaciones que afecten conservacion del material. |

---

### 15. Controles obligatorios

- verificacion diaria de ultima lectura por sala
- control de frescura de datos
- revision de alertas activas
- control de disponibilidad de broker y gateway
- control especifico de `T` y `H` en `Almacen Cosecha`
- control reforzado de `H` y `VPD` en `Sala de Floracion`
- control de integridad del registro con timestamp y deviceId
- control de backup de la base IoT

---

### 16. Criterios de aceptacion operativa

El sistema se considera operativo cuando:

- todas las salas tienen lecturas validas o incidencia documentada
- las alertas criticas son visibles y trazables
- los snapshots por sala son accesibles desde la app
- el visor QR muestra el contexto IoT correcto por sala
- el asistente contextual puede interpretar estado y SOPs
- la base local IoT puede respaldarse y recuperarse

---

### 17. Registros asociados

- registro diario de revision IoT
- historico de lecturas por sala
- historico de snapshots
- historico de alertas
- historico de actores de reconocimiento y cierre
- registro de incidencias
- registro de mantenimiento y calibracion
- registro de backup y recuperacion
- registro de evaluaciones de agentes

---

### 18. Referencias

- `SOP_Trazabilidad_Neuro-IA`
- documento de arquitectura IoT y agentes
- `server/iot-policies.json`
- `server/iot-anomalies.json`
- manuales del hardware instalado
- runbook de despliegue de infraestructura
- principios GACP aplicables a monitorizacion, registros y control ambiental

---

### 19. Anexos

#### Anexo I. Salas y variables monitorizadas

| Sala | Variables |
| --- | --- |
| Sala de Clones | T, H, VPD, DLI, T sustrato, EC, pH |
| Sala de Madres | T, H, VPD, DLI, T sustrato, EC, pH |
| Sala de Vegetativo | T, H, VPD, DLI, T sustrato, EC, pH |
| Sala de Floracion | T, H, VPD, DLI, T sustrato, EC, pH |
| Almacen Cosecha | T, H |

#### Anexo II. Rangos operativos por sala

| Sala | Variable | Unidad | Objetivo | Warning | Alarm |
| --- | --- | --- | --- | --- | --- |
| Sala de Clones | Temperatura | C | 24-26 | 22-28 | <20 o >30 |
| Sala de Clones | Humedad | % | 75-85 | 70-90 | <65 o >92 |
| Sala de Clones | VPD | kPa | 0.4-0.8 | 0.3-0.9 | <0.2 o >1.1 |
| Sala de Clones | DLI | mol/m2/d | 6-12 | 4-14 | <3 o >16 |
| Sala de Clones | T sustrato | C | 22-24 | 20-25 | <18 o >27 |
| Sala de Clones | EC | mS/cm | 0.4-0.8 | 0.3-1.0 | <0.2 o >1.2 |
| Sala de Clones | pH | pH | 5.8-6.2 | 5.6-6.4 | <5.4 o >6.6 |
| Sala de Madres | Temperatura | C | 24-28 | 22-30 | <20 o >32 |
| Sala de Madres | Humedad | % | 55-70 | 50-75 | <45 o >80 |
| Sala de Madres | VPD | kPa | 0.8-1.2 | 0.6-1.4 | <0.5 o >1.6 |
| Sala de Madres | DLI | mol/m2/d | 20-30 | 16-34 | <12 o >40 |
| Sala de Madres | T sustrato | C | 20-24 | 18-25 | <16 o >27 |
| Sala de Madres | EC | mS/cm | 1.2-2.0 | 1.0-2.2 | <0.8 o >2.5 |
| Sala de Madres | pH | pH | 5.8-6.3 | 5.6-6.5 | <5.4 o >6.7 |
| Sala de Vegetativo | Temperatura | C | 24-28 | 22-30 | <20 o >32 |
| Sala de Vegetativo | Humedad | % | 60-75 | 55-80 | <50 o >85 |
| Sala de Vegetativo | VPD | kPa | 0.8-1.2 | 0.6-1.4 | <0.5 o >1.6 |
| Sala de Vegetativo | DLI | mol/m2/d | 20-35 | 16-40 | <12 o >45 |
| Sala de Vegetativo | T sustrato | C | 20-24 | 18-25 | <16 o >27 |
| Sala de Vegetativo | EC | mS/cm | 1.2-1.8 | 1.0-2.0 | <0.8 o >2.3 |
| Sala de Vegetativo | pH | pH | 5.8-6.2 | 5.6-6.4 | <5.4 o >6.6 |
| Sala de Floracion | Temperatura | C | 22-26 | 20-28 | <18 o >30 |
| Sala de Floracion | Humedad | % | 45-60 | 40-65 | <35 o >70 |
| Sala de Floracion | VPD | kPa | 1.0-1.4 | 0.8-1.6 | <0.6 o >1.8 |
| Sala de Floracion | DLI | mol/m2/d | 30-45 | 25-50 | <20 o >55 |
| Sala de Floracion | T sustrato | C | 20-23 | 18-24 | <16 o >26 |
| Sala de Floracion | EC | mS/cm | 1.4-2.2 | 1.2-2.4 | <1.0 o >2.7 |
| Sala de Floracion | pH | pH | 5.8-6.3 | 5.6-6.5 | <5.4 o >6.7 |
| Almacen Cosecha | Temperatura | C | 15-21 | 13-23 | <10 o >25 |
| Almacen Cosecha | Humedad | % | 45-55 | 40-60 | <35 o >65 |

Reglas complementarias:

- `warning`: 3 lecturas consecutivas fuera de objetivo
- `alarm`: 3 lecturas consecutivas fuera de `alarm` o desvio claramente critico
- `recovery`: 3 lecturas consecutivas dentro de objetivo
- salas de cultivo:
  - `warning` por frescura: > 15 min
  - `alarm` por frescura: > 60 min
- `Almacen Cosecha`:
  - `warning` por frescura: > 10 min
  - `alarm` por frescura: > 30 min

#### Anexo III. Flujo de gestion de alertas

Niveles:

- `INFO`
- `WARNING low`
- `WARNING medium`
- `ALARM high`
- `OFFLINE critical`

Matriz resumida:

| Nivel | Responsable inicial | Tiempo objetivo | Escalado | Registro obligatorio |
| --- | --- | --- | --- | --- |
| INFO | Operario | Revision normal | No | No |
| WARNING low | Operario | < 30 min | No inmediato | Si persiste |
| WARNING medium | Operario | < 15 min | Direccion de Cultivo si no corrige | Si |
| ALARM high | Operario / Responsable de area | Inmediato | Direccion de Cultivo y QA cuando proceda | Si |
| OFFLINE critical | Tecnico de Sistema | Inmediato | Direccion de Cultivo si afecta operacion | Si |

Toda alerta `ALARM high` u `OFFLINE critical` requiere reconocimiento humano. El reconocimiento no implica cierre.

Cuando la alerta se gestiona desde la app, el sistema debe registrar:

- usuario que reconoce
- usuario que cierra
- observacion de cierre
- fecha y hora de cada accion

#### Anexo IV. Registro de mantenimiento, verificacion y calibracion

Registro general de intervencion:

| Fecha | Sala | Equipo | ID equipo | Tipo de intervencion | Motivo | Resultado | Estado final | Responsable | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Registro de verificacion funcional:

| Fecha | Equipo | ID equipo | Sala | Prueba realizada | Resultado esperado | Resultado observado | Conforme | Apto para uso | Responsable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Registro de calibracion:

| Fecha | Equipo | ID equipo | Sala | Magnitud | Patron / metodo | Antes | Despues | Resultado | Apto | Proxima revision | Responsable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Tipos de intervencion permitidos:

- inspeccion visual
- verificacion funcional
- calibracion
- mantenimiento preventivo
- mantenimiento correctivo
- sustitucion
- reinstalacion
- actualizacion de firmware
- validacion post-incidencia

#### Anexo V. Registro diario de revision IoT

Cabecera:

- Fecha
- Turno
- Hora de inicio de revision
- Hora de fin de revision
- Nombre del responsable
- Rol
- Estado general del sistema
- Observaciones generales

Tabla de revision por sala:

| Sala | Ultima lectura | Estado | Variables revisadas | Alertas activas | Accion requerida | Responsable | Observaciones |
| --- | --- | --- | --- | --- | --- | --- | --- |

Checklist diario:

- Se verifico recepcion de datos en todas las salas
- Se comprobo el estado de frescura de la telemetria
- Se revisaron alertas activas
- Se reviso especificamente Sala de Floracion
- Se reviso especificamente Almacen Cosecha
- Se comprobaron incidencias tecnicas abiertas
- Se verifico conectividad de gateway y broker
- Se registraron acciones correctivas si aplico

Registro de alertas del dia:

| Hora | Sala | Codigo de alerta | Severidad | Estado | Accion tomada | Resultado | Responsable |
| --- | --- | --- | --- | --- | --- | --- | --- |

Registro de incidencias tecnicas:

| Hora | Tipo | Sala | Descripcion | Impacto | Accion tecnica | Estado | Responsable |
| --- | --- | --- | --- | --- | --- | --- | --- |

Registros exportables desde la app:

- historico IoT por sala en `JSON` y `CSV`
- historico de alertas en `CSV`

---

**Neuro-IA | Monitorizacion IoT y Trazabilidad Digital**  
_Documento mantenido y ejecutado conjuntamente por la operativa interna, QA, Direccion de Cultivo y soporte tecnico._
