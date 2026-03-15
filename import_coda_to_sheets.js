const { google } = require('googleapis');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// -------------------------------------------------------------
// CONFIGURACIÓN
// -------------------------------------------------------------
const CODA_API_KEY = process.env.CODA_API_KEY || '804321d1-97fa-46ff-88f3-8a10af517147';
const DOC_ID = 'PE5DdjDJl6';
const SPREADSHEET_ID = '1fgV2c8sOUKKnRLa33NVjsnAu9AyNZj2zwazFA6gD-uI'; 

const auth = new google.auth.GoogleAuth({
  keyFile: './credenciales.json', 
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file'
  ],
});

let driveFolderId = null;

async function getOrCreateFolder(drive, folderName) {
    const res = await drive.files.list({
        q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)',
    });
    if (res.data.files.length > 0) return res.data.files[0].id;
    
    const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
    };
    const folder = await drive.files.create({
        resource: folderMetadata,
        fields: 'id',
    });
    return folder.data.id;
}

async function uploadToDrive(drive, fileUrl, fileName) {
    if (!fileUrl || !fileUrl.startsWith('http')) return fileUrl;
    if (!fileUrl.includes('coda.io') && !fileUrl.includes('codahosted.io')) return fileUrl;
    
    try {
        if (!driveFolderId) {
            driveFolderId = await getOrCreateFolder(drive, 'Trazabilidad_Documentos');
        }

        const resp = await fetch(fileUrl);
        const buffer = await resp.arrayBuffer();
        const stream = require('stream');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(Buffer.from(buffer));

        const fileMetadata = {
            name: fileName,
            parents: [driveFolderId],
        };
        const media = {
            mimeType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            body: bufferStream,
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        // Hacer el archivo público/compartible para que el visor pueda verlo
        await drive.permissions.create({
            fileId: file.data.id,
            requestBody: { role: 'reader', type: 'anyone' },
        });

        return file.data.webViewLink;
    } catch(err) {
        console.error(`Error subiendo ${fileName} a Drive:`, err.message);
        return "";
    }
}

function normalizeCodaValue(valor) {
    if (!valor) return '';
    let result = '';
    if (Array.isArray(valor)) {
        result = valor.map(v => (v && typeof v === 'object') ? (v.name || v.url || "") : v).filter(v => v !== '').join(', ');
    } else if (typeof valor === 'object') {
        result = valor.name || valor.url || "";
    } else {
        result = String(valor);
    }
    return result.replace(/`/g, '').trim();
}

async function getCodaTableRows(tableName) {
    const paramTabla = encodeURIComponent(tableName);
    const resp = await fetch(`https://coda.io/apis/v1/docs/${DOC_ID}/tables/${paramTabla}/rows?useColumnNames=true&valueFormat=rich`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${CODA_API_KEY}`, 'Content-Type': 'application/json' }
    });
    const data = await resp.json();
    return data.items || [];
}

async function migrarSoloGenetica() {
    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });
        const drive = google.drive({ version: 'v3', auth: client });

        console.log(`🚀 Sincronizando Genética a Google Drive (Modo v2.3)`);
        const rowsCultivares = await getCodaTableRows("Tabla de CULTIVARES");
        
        let dataGenetica = [["QR_ID", "Variedad", "Linaje", "Notas", "Imagen_URL", "Documentos_URL", "Quimiotipo", "Cannabinoides", "Terpenos"]];
        
        for (const [index, fila] of rowsCultivares.entries()) {
            const vals = fila.values;
            const variedad = normalizeCodaValue(vals["Variedad"]);
            if (!variedad) continue;

            const cleanIdGen = variedad; 
            console.log(`...Procesando ${variedad}`);

            const notas = (vals["Descripción INASE"] && vals["Descripción INASE"][0]) ? await uploadToDrive(drive, vals["Descripción INASE"][0].url, `${cleanIdGen}_INASE.pdf`) : "";
            const imagen = (vals["Imagen"] && vals["Imagen"][0]) ? await uploadToDrive(drive, vals["Imagen"][0].url, `${cleanIdGen}_Imagen.jpg`) : "";
            const docs = (vals["RNCP"] && vals["RNCP"][0]) ? await uploadToDrive(drive, vals["RNCP"][0].url, `${cleanIdGen}_RNCP.pdf`) : "";
            const cann = (vals["Perfil cannabinoides"] && vals["Perfil cannabinoides"][0]) ? await uploadToDrive(drive, vals["Perfil cannabinoides"][0].url, `${cleanIdGen}_Cannabinoides.pdf`) : "";
            const terp = (vals["Perfil terpenos"] && vals["Perfil terpenos"][0]) ? await uploadToDrive(drive, vals["Perfil terpenos"][0].url, `${cleanIdGen}_Terpenos.pdf`) : "";

            dataGenetica.push([cleanIdGen, variedad, normalizeCodaValue(vals["PROPIEDAD y obtentores"]), notas, imagen, docs, normalizeCodaValue(vals["Quimiotipo"]), cann, terp]);
        }
        
        await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: `'Sheet_Genetica'!A:Z` });
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `'Sheet_Genetica'!A1`, 
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: dataGenetica },
        });

        console.log(`✅ Sheet_Genetica actualizada con enlaces a DRIVE.`);
        
        // =========== 2. CONSTRUIR SHEET_EQUIPO ===========
        console.log(`\n--> Preparando Sheet_Equipo (Equipo de Trabajo)...`);
        const rowsEquipo = await getCodaTableRows("Table");
        let dataEquipo = [["ID", "Nombre", "Cargo", "Email"]];

        for (const fila of rowsEquipo) {
            const v = fila.values;
            dataEquipo.push([
                normalizeCodaValue(v["ID"]),
                normalizeCodaValue(v["Name"]),
                normalizeCodaValue(v["Cargo"]),
                normalizeCodaValue(v["Email"])
            ]);
        }
        await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: `'Sheet_Equipo'!A:Z` });
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `'Sheet_Equipo'!A1`, 
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: dataEquipo },
        });

        console.log(`✅ Sheet_Equipo actualizada. Todas las demás pestañas permanecen limpias.`);

    } catch (error) { console.error('❌ Error:', error.message); }
}

migrarSoloGenetica();
