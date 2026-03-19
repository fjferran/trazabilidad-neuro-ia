# Guia de Operacion

## 1. Objetivo

Esta guia describe como usar la aplicacion en operacion diaria.

## 2. Flujo general

El sistema opera en 6 fases:

1. Genetica
2. Madre
3. Clon
4. Vegetativo
5. Floracion
6. Cosecha

Adicionalmente, la app incluye una pestaña de `Labores` para checklist operativa diaria por turno.

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

### 3.2 Alta de clon

- seleccionar madre origen
- indicar fecha y cantidad
- guardar

### 3.3 Alta de vegetativo

- seleccionar clon origen
- la ubicacion se rellena por defecto como `Sala de Vegetativos`
- indicar fecha y cantidad
- guardar

### 3.4 Alta de floracion

- seleccionar vegetativo origen
- indicar ubicacion y fecha
- guardar

### 3.5 Alta de cosecha

- seleccionar floracion origen
- indicar fecha, peso humedo, peso seco y ubicacion
- guardar

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
