# Runbook de Despliegue Proxmox para Trazabilidad e IoT

## 1. Objetivo

Desplegar en produccion estable el sistema de trazabilidad, monitorizacion IoT y agentes especializados sobre un `Mini PC` con `Proxmox`, dejando el sistema operativo, respaldado y validado en red local.

## 2. Alcance

Hardware principal:

- `Mini PC` con `Proxmox`

Hardware alternativo soportado:

- `Raspberry Pi 5`

Servicios incluidos en primera version:

- `LXC trazabilidad-app`
- `LXC mqtt-broker`

Servicios opcionales:

- `Home Assistant`
- backup/monitoring

## 3. Prerrequisitos

- Mini PC disponible y probado
- BIOS/UEFI accesible
- `NVMe` instalado
- LAN cableada disponible
- IP fija o reserva DHCP
- `UPS` recomendado
- acceso fisico o remoto al equipo
- credenciales y variables disponibles:
  - acceso a Google Sheets si aplica
  - parametros MQTT
  - catalogo de salas aprobado
  - politicas por sala aprobadas

## 4. BOM minimo de referencia

- Mini PC `N100/N305` o superior
- `16 GB RAM` minimo
- `512 GB NVMe` minimo
- cable de red
- `UPS`
- monitor/teclado para bootstrap inicial si hace falta

## 5. Topologia objetivo

- `LXC 101 - trazabilidad-app`
- `LXC 102 - mqtt-broker`
- opcional:
  - `VM/LXC 103 - Home Assistant`
  - `LXC 104 - backup-monitoring`

## 6. Fase A - Preparacion del host

Checklist:

- verificar hardware
- verificar disco y RAM
- configurar refrigeracion adecuada
- conectar a `UPS`
- conectar a red LAN
- decidir IP fija
- documentar:
  - hostname
  - IP
  - MAC
  - ubicacion fisica
  - responsable tecnico

Validacion:

- arranque estable
- red funcional
- temperaturas correctas
- disco visible

## 7. Fase B - Instalacion de Proxmox

Pasos de alto nivel:

- instalar `Proxmox VE`
- definir:
  - hostname
  - usuario administrador
  - red de gestion
  - almacenamiento principal
- aplicar configuracion basica de seguridad
- verificar acceso a interfaz web de Proxmox
- registrar version instalada

Validacion:

- acceso web correcto
- almacenamiento local visible
- red y DNS correctos
- reinicio limpio del host

## 8. Fase C - Configuracion base de Proxmox

- crear almacenamiento y estrategia de snapshots
- definir convencion de nombres:
  - `pve-traza-prod`
  - `lxc-traza-app`
  - `lxc-mqtt`
- configurar:
  - zona horaria
  - NTP
  - backups programados
- documentar:
  - esquema de red
  - plan de IDs de contenedores
  - politica de snapshots

Validacion:

- hora correcta
- almacenamiento disponible
- interfaz Proxmox estable

## 9. Fase D - Crear LXC 101 `trazabilidad-app`

Objetivo:

- alojar backend, frontend, `SQLite`, `local_mirror`, capa IoT y agentes

Definir:

- template Linux compatible
- CPU/RAM asignadas
- disco persistente
- red
- mounts persistentes para:
  - `local_mirror`
  - base IoT
  - backups logicos
  - logs opcionales

Configuracion recomendada:

- `4 GB RAM`
- `2-4 vCPU`
- volumen persistente en NVMe

Validacion:

- contenedor inicia
- red y DNS operativos
- almacenamiento montado correctamente

## 10. Fase E - Crear LXC 102 `mqtt-broker`

Objetivo:

- alojar `Mosquitto`

Definir:

- template ligero
- RAM/CPU minimas
- disco pequeno persistente
- red accesible desde ESP/gateway y app

Configuracion recomendada:

- `512 MB RAM`
- `1 vCPU`

Validacion:

- contenedor inicia
- puerto MQTT accesible en LAN
- logs del broker operativos

## 11. Fase F - Despliegue de aplicacion

Dentro de `trazabilidad-app`:

- instalar runtime necesario
- desplegar backend y frontend
- validar rutas:
  - app web
  - API
- montar persistencia para:
  - trazabilidad existente
  - IoT `SQLite`
  - exportaciones

Validacion:

- app abre en navegador local
- API responde
- sistema actual de trazabilidad sigue operativo

## 12. Fase G - Configuracion MQTT

- instalar/configurar `Mosquitto`
- definir topics por sala:
  - clones
  - madres
  - vegetativo
  - floracion
  - almacen cosecha
- validar conectividad con:
  - ESP/gateway
  - `trazabilidad-app`
- definir autenticacion si aplica
- documentar topics oficiales y payloads

Validacion:

- recepcion de mensajes reales o de prueba
- separacion correcta por sala
- timestamps y payloads coherentes

## 13. Fase H - Activacion de la base IoT

- crear base `SQLite`
- crear tablas:
  - salas
  - dispositivos
  - lecturas
  - snapshots
  - alertas
  - politicas
  - agent runs opcional
- cargar seeds:
  - catalogo de salas
  - politicas activas iniciales

Validacion:

- DB accesible
- tablas creadas
- seeds correctos
- consultas basicas funcionales

## 14. Fase I - Ingesta y normalizacion

- conectar backend al broker
- habilitar parser de payloads
- validar:
  - tipos
  - metricas admitidas
  - timestamps
  - room mapping
- persistir lecturas validas
- registrar invalidaciones o conflictos

Validacion:

- lecturas entran en `iot_readings`
- snapshots se actualizan
- `Almacen Cosecha` ignora metricas no aplicables

## 15. Fase J - Politicas y alertas

- activar motor de politicas
- cargar thresholds por sala
- validar:
  - `OK`
  - `WARNING`
  - `ALARM`
  - `STALE`
  - `OFFLINE`
- probar persistencia y recuperacion de alertas

Validacion:

- snapshots correctos por sala
- alertas se abren/cambian/cierran correctamente
- reglas criticas de floracion y almacen funcionan

## 16. Fase K - Integracion UI

- `Dashboard`
  - tarjetas por sala
  - alertas activas
- `SearchView`
  - sala del nodo
  - contexto IoT
- `Asistente`
  - preparado para usar contexto de sala/lote

Validacion:

- datos visibles en web
- QR/lote resuelve sala correcta
- alertas visibles y coherentes

## 17. Fase L - Agentes

Orden:

- `S2-IoT`
- `S2-E`
- `S1`

Validacion por agente:

- `S2-IoT`
  - clasifica bien
  - resume bien
- `S2-E`
  - severidad y escalado correctos
- `S1`
  - responde con contexto y fuentes

## 18. Fase M - Backup y recuperacion

- configurar snapshot Proxmox antes de cambios mayores
- configurar backup programado de contenedores
- configurar backup logico de:
  - `local_mirror`
  - `SQLite`
  - politicas
  - configuracion MQTT
- definir ubicacion de backup local y, si existe, externo

Validacion:

- backup ejecuta sin error
- restore de prueba documentado
- consistencia basica comprobada

## 19. Fase N - Validacion operativa final

Checklist:

- todas las salas visibles
- MQTT estable
- snapshots correctos
- alertas operativas
- visor QR con contexto IoT
- backups probados
- SOP y arquitectura alineados
- runbook actualizado con datos reales del despliegue

## 20. Criterios de aceptacion

El sistema se considera listo para produccion cuando:

- host y contenedores son estables 24/7
- la app es accesible en LAN
- MQTT recibe y enruta telemetria
- la base IoT persiste lecturas y alertas
- el dashboard muestra estado correcto por sala
- el visor QR hereda contexto IoT
- las politicas activas estan cargadas
- el backup y recuperacion estan probados
- la documentacion operativa esta cerrada

## 21. Operacion diaria minima post-despliegue

- revisar salud del host
- revisar espacio en disco
- revisar MQTT
- revisar salas sin datos
- revisar alertas activas
- revisar backup del dia anterior

## 22. Runbook de contingencia resumido

- si cae `mqtt-broker`:
  - verificar contenedor
  - red
  - servicio broker
  - reanudar y registrar incidencia
- si cae `trazabilidad-app`:
  - verificar contenedor
  - disco
  - logs
  - DB
  - restaurar si hace falta
- si cae el host Proxmox:
  - verificar energia
  - `UPS`
  - disco
  - acceso local
  - restaurar desde backup si corresponde

## 23. Evidencias a conservar

- inventario del hardware
- IPs y hostnames
- capturas o registros de validacion
- fechas de despliegue
- version del stack
- version de politicas
- backup inicial validado
- responsable tecnico del despliegue

## 24. Recomendacion de uso real

- arrancar en produccion con arquitectura minima:
  - `trazabilidad-app`
  - `mqtt-broker`
- anadir `Home Assistant` solo cuando el nucleo este estable
- mantener simple la primera puesta en marcha
