const { google } = require('googleapis');

const SPREADSHEET_ID = '1fgV2c8sOUKKnRLa33NVjsnAu9AyNZj2zwazFA6gD-uI'; 
const DRIVE_FOLDER_ID = '13Z3WJ0GRyQ1PTDX9ys7ZhuKVoJNIN_y9';

const auth = new google.auth.GoogleAuth({
  keyFile: './credenciales.json', 
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.readonly'],
});

async function main() {
    const client = await auth.getClient();
    const drive = google.drive({ version: 'v3', auth: client });
    const sheets = google.sheets({ version: 'v4', auth: client });

    console.log("🔍 Buscando archivos en Drive...");
    const res = await drive.files.list({ q: `'${DRIVE_FOLDER_ID}' in parents`, fields: 'files(name, webViewLink, id)'});
    const driveFiles = {};
    res.data.files.forEach(f => driveFiles[f.name] = f.webViewLink);

    console.log("⬇️ Descargando Google Sheet_Genetica...");
    const sheetData = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet_Genetica!A:I'
    });

    const rows = sheetData.data.values;
    if (!rows || rows.length === 0) return console.log("Hoja vacia.");

    // Filas
    // 0: QR_ID, 1: Variedad, 2: Linaje, 3: Notas(INASE), 4: Imagen_URL, 5: Documentos_URL(RNCP), 6: Quimiotipo, 7: Cannabinoides, 8: Terpenos

    console.log("🔄 Reemplazando links de Coda por links de tu Google Drive personal...");
    for (let i = 1; i < rows.length; i++) {
        const qrId = rows[i][0];
        
        // Match con el nombre de archivo que generamos en local
        const inaseReq = driveFiles[`${qrId}_INASE.pdf`];
        const imgReq = driveFiles[`${qrId}_Imagen.jpg`];
        const rncpReq = driveFiles[`${qrId}_RNCP.pdf`];
        const cannReq = driveFiles[`${qrId}_Cannabinoides.pdf`];
        const terpReq = driveFiles[`${qrId}_Terpenos.pdf`];

        if (inaseReq) rows[i][3] = inaseReq;
        if (imgReq) rows[i][4] = imgReq;
        if (rncpReq) rows[i][5] = rncpReq;
        if (cannReq) rows[i][7] = cannReq;
        if (terpReq) rows[i][8] = terpReq;
    }

    console.log("⬆️ Subiendo actualización al Google Sheet...");
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sheet_Genetica!A1:I' + rows.length,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows }
    });

    console.log("✅ ¡Listos! Todos los links ya son independientes de Coda.");
}

main().catch(console.error);
