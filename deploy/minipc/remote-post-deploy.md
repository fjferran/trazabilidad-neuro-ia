# Comandos remotos post-despliegue

Una vez sincronizado el proyecto al guest remoto, ejecutar alli:

```bash
cd /opt/trazabilidad
npm install
npm run build
npm run server
```

## Alternativa con PM2 o servicio

Si mas adelante quieres dejarlo residente:

```bash
cd /opt/trazabilidad
npm install
npm run build
nohup npm run server > server.log 2>&1 &
```

## Comprobaciones

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/iot/health
```
