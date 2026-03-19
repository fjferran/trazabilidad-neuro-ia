# Guia de Backup y Recuperacion

## 1. Objetivo

Esta guia explica como exportar, guardar y restaurar el estado local del sistema.

## 2. Que incluye un backup

El backup JSON incluye:

- snapshot de rangos locales
- cola de sincronizacion
- manifest de assets
- metadatos del espejo

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
- se necesita restaurar operacion offline
- se necesita replicar el entorno en otra instalacion

## 7. Recomendaciones operativas

- exportar backup antes de cambios importantes
- conservar varias copias fechadas
- guardar una copia fuera de la maquina local
- comprobar la restauracion en entorno controlado si es posible

## 8. Comprobaciones tras restaurar

Verificar:

1. que el dashboard carga
2. que el numero de nodos es correcto
3. que la cola pendiente coincide con lo esperado
4. que las imagenes locales siguen resolviendo
5. que el visor QR puede abrir nodos
