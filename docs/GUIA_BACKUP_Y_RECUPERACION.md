# Guia de Backup y Recuperacion

## 1. Objetivo

Esta guia explica como exportar, guardar y restaurar el estado local del sistema, incluyendo trazabilidad y capa IoT local.

## 2. Que incluye un backup

El backup JSON incluye:

- snapshot de rangos locales
- cola de sincronizacion
- manifest de assets
- metadatos del espejo
- bloque IoT con:
  - salas
  - dispositivos
  - lecturas
  - snapshots
  - alertas
  - politicas
  - observaciones de cierre y actores de alerta

## 3. Exportar backup

Desde el dashboard:

- abrir panel de sincronizacion
- pulsar `Exportar Backup`

Tambien por API:

```bash
curl -O http://localhost:3001/api/backup/export
```

## 4. Restaurar backup desde la app

- abrir panel de sincronizacion
- pulsar `Importar Backup`
- seleccionar el fichero JSON exportado

La app recarga:

- espejo local
- cola
- opciones visuales
- estado de sincronizacion
- disponibilidad de usuarios/roles al volver a entrar en la app
- base IoT local y snapshots por sala
- alertas e historico IoT incluidos en el backup
- historico de reconocimiento y cierre manual de alertas

## 5. Restaurar backup por API

```bash
curl -X POST http://localhost:3001/api/backup/restore \
  -H 'Content-Type: application/json' \
  --data-binary @backup.json
```

## 6. Cuando usar backup

Usar backup si:

- cambia la maquina local
- se corrompe el espejo local
- se corrompe la base IoT local
- se necesita restaurar operacion offline
- se necesita replicar el entorno en otra instalacion

## 7. Recomendaciones operativas

- exportar backup antes de cambios importantes
- conservar varias copias fechadas
- guardar una copia fuera de la maquina local
- comprobar la restauracion en entorno controlado si es posible
- probar periodicamente que `local_iot/iot.db` queda cubierto por el backup

## 8. Comprobaciones tras restaurar

Verificar:

1. que el dashboard carga
2. que el numero de nodos es correcto
3. que la cola pendiente coincide con lo esperado
4. que las imagenes locales siguen resolviendo
5. que el visor QR puede abrir nodos
6. que las salas IoT muestran snapshot correcto
7. que las alertas IoT activas o historicas se restauran conforme al backup
