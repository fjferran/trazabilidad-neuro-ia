{\rtf1\ansi\ansicpg1252\cocoartf2822
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # PROJECT SPECIFICATION: ASA-Cannabis-Traceability (Sheets Edition)\
# BACKEND: Google Sheets API\
# ARCHITECTURE: Agent-Based Service Architecture (ASA)\
\
## 1. OBJETIVO\
Migrar la l\'f3gica de "Producci\'f3n Vegetal" de Coda.io a Google Sheets y utilizar esta \'faltima como base de datos central para una aplicaci\'f3n m\'f3vil de trazabilidad con QR.\
\
## 2. ESTRUCTURA DE LA BASE DE DATOS (HOJAS)\
Instrucci\'f3n: Antigravity debe crear o conectarse a un Google Spreadsheet con las siguientes pesta\'f1as:\
- **Sheet_Genetica:** ID_Gen, Variedad, Linaje, Notas.\
- **Sheet_Plantas:** QR_ID (PK), Variedad, Fase (Madre/Clon/Veg/Flor), Ubicaci\'f3n, Fecha_Alta.\
- **Sheet_Actividades:** Timestamp, QR_ID, Operario, Acci\'f3n (Riego/Poda/IPM), Valor (pH/EC), Foto_URL.\
- **Sheet_Sensores:** Log_ID, Zona, Temperatura, Humedad, VPD, DLI.\
\
## 3. L\'d3GICA DE AGENTES (ASA)\
- **Agent S1 (Knowledge):** Ayuda al usuario a entender los datos de las hojas y sugiere acciones basadas en GACP.\
- **Agent S2 (Sheets-IoT):** Lee la pesta\'f1a 'Sheet_Sensores' y calcula alertas si los valores en las celdas salen de rango.\
- **Agent S2-E (Watchdog):** Monitorea la hoja 'Sheet_Actividades'. Si no hay registros de riego en >24h para un QR_ID activo, env\'eda alerta.\
\
## 4. FUNCIONALIDADES M\'d3VILES (PWA)\
- **Lectura de QR:** Al escanear, busca la fila correspondiente en 'Sheet_Plantas' por el QR_ID.\
- **Escritura en Sheets:** Cada formulario enviado a\'f1ade una nueva fila al final de 'Sheet_Actividades'.\
- **Validaci\'f3n:** Antes de escribir en la hoja, verifica que el QR_ID exista y que los datos (pH, Temp) sean num\'e9ricos.\
\
## 5. TAREA INICIAL PARA ANTIGRAVITY\
1. Con\'e9ctate a Google Sheets API.\
2. Crea una funci\'f3n para "Importar desde Coda" que lea el Doc _dPE5DdjDJl6 y mapee los datos a las nuevas hojas de Google.\
3. Genera el c\'f3digo para un formulario m\'f3vil que escriba directamente en la hoja de 'Sheet_Actividades'.}