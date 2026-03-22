# Procedimiento Operativo Estandar (SOP)

## Trazabilidad Cannabica Integral Offline-First (6 Niveles)

| Empresa: Neuro-IA                                                | Codigo: SOP-TRA-001         | Version: 4.1        |
| ---------------------------------------------------------------- | --------------------------- | ------------------- |
| **Titulo:** Gestion de Trazabilidad desde Genetica hasta Cosecha | **Fecha Vigor:** 19/03/2026 | **Paginas:** 1 de 1 |

---

### 1. Historial de Revisiones

| Version | Fecha      | Descripcion del Cambio                                                                                                 | Autor         |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- | ------------- |
| 1.0     | 15/03/2026 | Creacion inicial del sistema de 4 niveles.                                                                             | Neuro-IA Team |
| 2.0     | 17/03/2026 | Ampliacion a 6 niveles (Floracion y Cosecha) y sufijos acumulativos.                                                   | Neuro-IA Team |
| 2.1     | 18/03/2026 | Formalizacion de estructura SOP industrial (GACP).                                                                     | Neuro-IA Team |
| 3.0     | 18/03/2026 | Reestructuracion de nomenclatura ID y motor de rastreo de linaje automatizado.                                         | Neuro-IA Team |
| 4.0     | 19/03/2026 | Ampliacion a operativa offline-first con copia espejo local, cola de sincronizacion, auditoria, backup y recuperacion. | Neuro-IA Team |
| 4.1     | 20/03/2026 | Integracion de usuarios locales por rol, auditoria con actor/rol y modulo de labores operativas por turno.             | Neuro-IA Team |
| 4.2     | 22/03/2026 | Integracion operativa con pestaña `Datos IoT`, historico de sala, alertas manuales y referencia cruzada a SOP-IOT-001. | Neuro-IA Team |

---

### 2. Lista de Distribucion

- **Copia Digital 01**: Direccion de Cultivo.
- **Copia Digital 02**: Responsable de Calidad (QA).
- **Copia Digital 03**: Terminales de Sala / Operarios.
- **Copia Digital 04**: Administracion Tecnica del Sistema.

---

### 3. Objetivo y Proposito

Garantizar la identificacion inequivoca de cada lote, planta y fase biologica desde la genetica base hasta la cosecha final, permitiendo:

- reconstruccion retrospectiva completa del linaje
- bloqueo de saltos de fase
- operacion continua en local aunque falle internet
- sincronizacion posterior con la hoja maestra en Google Drive
- evidencia auditable de altas, cambios, lecturas QR, conflictos y restauraciones

Este SOP adapta la operativa de cultivo al modelo digital offline-first de Neuro-IA Trazabilidad.

---

### 4. Alcance

Aplica a:

- geneticas maestras
- plantas madre
- lotes de clones
- lotes vegetativos
- lotes en floracion
- lotes de cosecha
- etiquetado QR
- verificaciones QA
- sincronizacion operativa con Google Sheets
- respaldo y recuperacion del sistema local
- control operativo por usuario y rol
- checklist de labores por turno
- integracion contextual con monitorizacion IoT por sala segun `SOP-IOT-001`
- consulta de historico IoT por sala y gestion contextual de alertas desde la app

---

### 5. Equipo, Software y Recursos

#### 5.1 Hardware

- ordenador o terminal local de operacion
- impresora termica de etiquetas QR
- dispositivos moviles para lectura QR
- almacenamiento local suficiente para snapshot, historial y assets
- infraestructura edge local soportada para despliegue estable o compacto:
  - Mini PC con Proxmox como plataforma principal de produccion estable
  - Raspberry Pi 5 como despliegue compacto soportado

#### 5.2 Software

- App Web Neuro-IA Trazabilidad
- Google Sheets como hoja maestra remota
- navegador moderno
- servicio local Node/Express para backend y sincronizacion
- selector de usuario local con permisos por rol
- broker MQTT local para telemetria IoT
- base local SQLite para historico y estado IoT

#### 5.3 Datos y activos

- hoja maestra compartida con la cuenta de servicio
- credenciales de Google autorizadas
- imagenes, PDFs y enlaces documentales asociados a geneticas y lotes

---

### 6. Definiciones operativas

- **Nodo**: cada fila trazable del sistema.
- **Origen**: nodo anterior del que deriva la fase actual.
- **Espejo local**: copia persistente en disco de los datos remotos y de trabajo local.
- **Cola de sincronizacion**: conjunto de operaciones locales pendientes de subir a Google Sheets.
- **Conflicto**: discrepancia entre dato local y dato remoto que requiere decision manual.
- **Visor QR**: modulo que muestra la ficha visual de un nodo y su linaje.
- **Labores**: checklist operativa por turno para tareas clave del cultivo.
- **Datos IoT**: pestaña operativa para revisar estado ambiental por sala, historico y alertas.

---

### 7. Estructura funcional del sistema

La trazabilidad se organiza en 6 niveles:

1. **Genetica Base** (`Sheet_Genetica`)
2. **Planta Madre** (`Sheet_Madres`)
3. **Lote de Clones** (`Sheet_Clones`)
4. **Lote Vegetativo** (`Sheet_Lotes`)
5. **Lote de Floracion** (`Sheet_Floracion`)
6. **Lote de Cosecha** (`Sheet_Cosecha`)

Cada nivel depende estrictamente del anterior.

---

### 8. Estructura minima obligatoria de datos

#### 8.1 Sheet_Genetica

- ID Genetica
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

#### 8.2 Sheet_Madres

- ID Madre
- Genetica
- Ubicacion
- Fecha
- Estado
- Imagen
- Notas

#### 8.3 Sheet_Clones

- ID Clon
- Madre Origen
- Genetica
- Fecha
- Cantidad
- Estado
- Notas

#### 8.4 Sheet_Lotes

- ID Lote
- ID Origen
- Ubicacion
- Fecha
- Estado
- Cantidad
- Notas

#### 8.5 Sheet_Floracion

- ID Lote
- ID Origen
- Fecha
- Ubicacion
- Estado
- Cantidad
- Notas

#### 8.6 Sheet_Cosecha

- ID Lote
- ID Origen
- Fecha Cosecha
- Peso Humedo (g)
- Peso Seco (g)
- Ubicacion
- Notas

No deben alterarse columnas sin validacion del Responsable Tecnico y QA.

---

### 9. Jerarquia e identificacion profesional

Cada codigo QR y etiqueta debe ser unico, intransferible y acumulativo.

#### 9.1 Madre (`PM`)

Formato:

`[PREFIJO_3L]-PM-[NUM]-[YY]`

Ejemplo:

`PAC-PM-1-26`

Donde `PREFIJO_3L` corresponde a las 3 primeras letras de la genetica en mayusculas.

#### 9.2 Clon (`CL`)

Formato:

`[ID_MADRE]-CL-[NUM]`

Ejemplo:

`CBG-PM-1-26-CL-1`

#### 9.3 Vegetativo (`V`)

Formato:

`[ID_CLON]-V`

Ejemplo:

`CBG-PM-1-26-CL-1-V`

#### 9.4 Floracion (`F`)

Formato:

`[ID_VEGETATIVO]F`

Ejemplo:

`CBG-PM-1-26-CL-1-VF`

#### 9.5 Cosecha (`C`)

Formato:

`[ID_FLORACION]C`

Ejemplo:

`CBG-PM-1-26-CL-1-VFC`

---

### 10. Restricciones de origen y control de fase

Reglas obligatorias:

- no se crea madre sin genetica valida
- no se crea clon sin madre valida
- no se crea vegetativo sin clon valido
- no se crea floracion sin vegetativo valido
- no se crea cosecha sin floracion valida
- no se aceptan IDs duplicadas en local o en cola pendiente

El sistema debe bloquear automaticamente cualquier salto de fase.

---

### 11. Procedimiento operativo diario

#### 11.1 Alta de genetica base

La genetica base puede darse de alta directamente en la app en modo local-first y despues sincronizarse con la hoja maestra.

Campos recomendados:

- Variedad
- Linaje
- Imagen URL
- Documentos URL
- Quimiotipo
- Cannabinoides URL
- Terpenos URL
- Notas

La genetica debe quedar disponible inmediatamente para nuevas madres, visor QR, catalogo visual y etiquetado.

#### 11.2 Alta de planta madre

El operario:

1. abre la seccion de altas
2. selecciona la genetica origen
3. introduce ubicacion, fecha y notas
4. guarda el registro
5. el sistema genera la ID automaticamente
6. imprime la etiqueta QR

#### 11.3 Alta de lote de clones

1. seleccionar la madre origen
2. indicar fecha, cantidad y notas
3. registrar
4. imprimir etiqueta QR

#### 11.4 Alta de lote vegetativo

1. seleccionar el clon origen
2. indicar ubicacion, fecha, cantidad y notas
3. registrar
4. imprimir etiqueta QR

#### 11.5 Alta de lote en floracion

1. seleccionar vegetativo origen
2. indicar ubicacion, fecha, cantidad y notas
3. registrar
4. imprimir etiqueta QR

#### 11.6 Alta de cosecha

1. seleccionar floracion origen
2. registrar fecha de cosecha
3. registrar peso humedo obligatorio
4. registrar peso seco cuando proceda
5. registrar ubicacion y notas
6. imprimir etiqueta QR si aplica

---

### 12. Etiquetado QR

Tras cada alta, el operario debe acceder a `Etiquetado`.

La etiqueta debe contener como minimo:

- QR del nodo
- ID completa
- tipo de nodo
- variedad o contexto si aplica
- estado de sincronizacion

El QR debe abrir la ficha visual del nodo en la app usando el patron `?search=<ID>`.

Cuando el acceso se realiza desde QR en movil, la app debe abrir la ficha en modo standalone, sin menu lateral, sin cabecera global, sin buscador manual, sin historial del nodo y sin controles de edicion local.

---

### 13. Verificacion retrospectiva y control QA

El Responsable de Calidad debe usar `Visor QR` para:

- escanear o buscar una ID
- revisar imagen, hoja y fila origen
- comprobar los datos de la fase actual
- verificar el origen inmediato
- revisar el linaje completo hasta genetica
- consultar historial del nodo

En auditoria, el sistema debe mostrar la cadena completa sin depender de acceso manual a la hoja remota.

---

### 14. Operativa offline-first

#### 14.1 Principio general

La aplicacion trabaja primero en local y sincroniza despues.

#### 14.2 Lectura

- si Google esta disponible, se refresca el espejo
- si Google falla, se sigue operando desde la copia local

#### 14.3 Escritura

- toda alta o edicion se escribe primero en local
- la operacion se encola para sincronizacion posterior
- el cambio debe verse inmediatamente en visor y etiquetado

#### 14.4 Copia espejo local

El sistema mantiene:

- `snapshot.json`
- `asset-manifest.json`
- `sync-queue.json`
- `history.json`
- carpeta `assets/`

---

### 15. Sincronizacion con Google Sheets

La sincronizacion se hace en segundo plano o por accion manual.

Estados posibles de una operacion:

- `pending`
- `synced`
- `sync_error`
- `conflict`
- `discarded`

El panel de sincronizacion debe permitir:

- ver operaciones pendientes
- reintentar
- descartar
- resolver conflictos

---

### 16. Conflictos

Un conflicto ocurre cuando el dato local no puede sincronizarse limpiamente con Google Sheets.

Caso principal:

- ID ya existente en remoto

El sistema debe mostrar:

- datos locales
- datos remotos
- motivo del conflicto

Resoluciones permitidas:

- **Mantener local**: sobrescribir remoto con el dato local
- **Mantener remoto**: descartar la operacion local conflictiva

Solo personal autorizado debe resolver conflictos.

---

### 17. Edicion local controlada

Se permite editar campos seguros cuando el nodo este sincronizado.

Campos tipicos editables:

- Ubicacion
- Estado
- Cantidad
- Fecha
- Fecha Cosecha
- Peso Humedo (g)
- Peso Seco (g)
- Notas

No debe editarse el identificador raiz del nodo desde operativa ordinaria.

---

### 18. Auditoria y registro de evidencias

El sistema debe conservar historial de:

- lecturas QR (`node_view`)
- altas locales
- ediciones locales
- sincronizaciones remotas correctas
- errores de sincronizacion
- conflictos detectados
- reintentos
- descartes
- resoluciones de conflicto
- restauraciones de backup

Cuando la accion provenga de la interfaz, el evento debe registrar tambien:

- actor
- rol

La pantalla de `Auditoria` debe permitir filtrado y exportacion.

---

### 19. Backup y recuperacion

La operativa debe permitir:

- exportar backup completo del espejo local
- importar backup previamente exportado

El backup debe incluir:

- snapshot de rangos
- cola de sincronizacion
- manifest de assets
- metadatos del espejo
- la capa IoT dispone de respaldo especifico segun `SOP-IOT-001`

Se recomienda exportar backup:

- antes de cambios estructurales
- antes de mantenimiento tecnico
- antes de migrar a otra maquina

---

### 20. Responsabilidades

| Cargo                           | Responsabilidad                                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Operario de Sala**            | Registrar altas, imprimir etiquetas, verificar colocacion fisica, reportar incidencias de escaneo o sync.                               |
| **Responsable de Calidad (QA)** | Verificar trazabilidad con Visor QR, auditar pesos humedos, revisar historial y resolver incidencias operativas junto a administracion. |
| **Director de Cultivo**         | Aprobar nuevas geneticas, validar operativa, supervisar consistencia de la hoja maestra y tomar decisiones sobre conflictos relevantes. |
| **Responsable Tecnico**         | Mantener credenciales, espejo local, sincronizacion, backups, restauraciones y soporte del sistema.                                     |

### 20.1 Roles y permisos de acceso en la app

El sistema debe aplicar perfiles operativos diferenciados:

- **Operario**
  - acceso a altas, etiquetado, visor QR, geneticas, labores y auditoria operativa
  - sin acceso a acciones tecnicas de sincronizacion o backup
- **Calidad (QA)**
  - acceso a visor QR, geneticas, auditoria y labores
  - sin edicion local ni restauracion tecnica
- **Direccion de Cultivo**
  - acceso a supervision general, auditoria, conflictos y coordinacion operativa
- **Responsable Tecnico**
  - acceso a sincronizacion, backups, restauracion, resolucion de conflictos y mantenimiento del sistema

Las labores mostradas por la app pueden adaptarse por rol segun bloque funcional.

El acceso actual puede realizarse mediante seleccion de usuario local al entrar en la app, quedando el rol asociado visible en cabecera y auditoria.

### 20.2 Modulo de labores

La app debe incluir un modulo de `Labores` con checklist diaria por fecha y turno.

Debe permitir:

- marcar tareas realizadas
- visualizar progreso global
- visualizar progreso por bloque
- adaptar bloques visibles por rol
- conservar el estado localmente por navegador y turno

---

### 21. Controles obligatorios

- comprobacion diaria de estado del espejo local
- comprobacion diaria de cola pendiente
- verificacion de que no existan conflictos abiertos sin revision
- verificacion semanal de exportacion de backup
- verificacion de lectura QR en terminal movil

---

### 22. Criterios de aceptacion operativa

El sistema se considera conforme si:

- las fases se crean sin saltos de origen
- las IDs son unicas y acumulativas
- los QR muestran la ficha visual correcta
- el linaje se reconstruye hasta genetica
- la app sigue operando con internet intermitente
- las operaciones pendientes se reflejan en cola
- los conflictos se detectan y resuelven manualmente
- existen backups exportables y restaurables
- la auditoria registra lecturas y cambios

---

### 23. Referencias

- GACP: Good Agricultural and Collection Practices for Starting Materials of Herbal Origin (EMA)
- Normativa local aplicable al cultivo y trazabilidad
- Documentacion interna de Neuro-IA Trazabilidad
- Arquitectura tecnica del sistema y guias operativas asociadas
- SOP-IOT-001: Monitorizacion IoT de Variables Ambientales y de Fertirriego

---

**Neuro-IA | Excelencia en Trazabilidad Digital**  
_Documento mantenido y ejecutado conjuntamente por el sistema Neuro-IA y su operativa interna._
