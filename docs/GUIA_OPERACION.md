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

## 3. Alta de nuevas entidades

Entrar en la seccion `Pasaporte`.

### 3.1 Alta de madre

- seleccionar genetica
- indicar ubicacion y fecha
- guardar
- el sistema genera la ID automaticamente

### 3.2 Alta de clon

- seleccionar madre origen
- indicar fecha y cantidad
- guardar

### 3.3 Alta de vegetativo

- seleccionar clon origen
- indicar ubicacion, fecha y cantidad
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

Permite filtrar y exportar historial.
