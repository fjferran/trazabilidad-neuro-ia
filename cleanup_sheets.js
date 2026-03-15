const { google } = require('googleapis');
const fs = require('fs');

const SPREADSHEET_ID = '1fgV2c8sOUKKnRLa33NVjsnAu9AyNZj2zwazFA6gD-uI';

const auth = new google.auth.GoogleAuth({
  keyFile: './credenciales.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function cleanupSheets() {
    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        // 1. Obtener todas las pestañas actuales
        const res = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
        const allSheets = res.data.sheets;
        const sheetTitles = allSheets.map(s => s.properties.title);
        
        console.log("Pestañas actuales:", sheetTitles);

        const keepList = ['Sheet_Genetica', 'Sheet_Equipo'];
        
        // 2. Asegurarnos de que las que queremos mantener existan (o crearlas/renombrarlas)
        const updates = [];
        const toDeleteIds = [];
        
        for (const s of allSheets) {
            const title = s.properties.title;
            const id = s.properties.sheetId;
            
            if (keepList.includes(title)) {
                console.log(`Manteniendo: ${title}`);
            } else {
                // Marcar para borrar (incluyendo labores y plagas si existen)
                console.log(`Marcando para borrar: ${title}`);
                toDeleteIds.push(id);
            }
        }

        if (!sheetTitles.includes('Sheet_Equipo')) {
            console.log("Creando pestaña 'Sheet_Equipo'...");
            updates.push({ addSheet: { properties: { title: 'Sheet_Equipo' } } });
        }

        // Ejecutar renombre y creación primero
        if (updates.length > 0) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: { requests: updates }
            });
        }

        // Ahora borrar las que sobran
        // NOTA: Google Sheets requiere al menos una pestaña. 
        // Como mantenemos Sheet_Genetica, no hay problema.
        if (toDeleteIds.length > 0) {
            console.log(`Borrando ${toDeleteIds.length} pestañas sobrantes...`);
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                requestBody: {
                    requests: toDeleteIds.map(id => ({ deleteSheet: { sheetId: id } }))
                }
            });
        }

        // 3. Limpiar contenido de Sheet_Genetica (opcional? El usuario dijo "salvo", quizás quiere mantener los datos de genética)
        // El usuario dijo "iniciar el proceso de trazabilidad de forma segura y desde cero", 
        // pero la genética suele ser la base. No la limpiaré a menos que me lo pida expresamente si dice "limpia todas... salvo".
        // "Limpia todas salvo..." suele significar que las que se salvan se quedan como están.

        console.log("🚀 Limpieza completada.");

    } catch (err) {
        console.error("Error en cleanup:", err.message);
    }
}

cleanupSheets();
