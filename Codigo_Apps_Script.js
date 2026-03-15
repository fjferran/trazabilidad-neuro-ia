/**
 * ==============================================================================
 * 🚀 API TRAZABILIDAD NEURO-IA - VERSIÓN DRIVE INTEGRADO (v2.4)
 * ==============================================================================
 * 🛡️ PERMISOS REQUERIDOS:
 * DriveApp.getRootFolder(); // Forzar detección de: https://www.googleapis.com/auth/drive
 */

// CONFIGURACIÓN CODA (Sincronización directa desde Google Apps Script)
const CODA_API_KEY = '804321d1-97fa-46ff-88f3-8a10af517147';
const DOC_ID = 'PE5DdjDJl6';

// Nombres de las pestañas maestras
const SHEET_LABORES = 'labores';
const SHEET_PLAGAS = 'plagas';
const SHEET_GENETICA = 'Sheet_Genetica';
const SHEET_EQUIPO = 'Sheet_Equipo';

// ID de tu carpeta de Drive compartida
const DRIVE_FOLDER_ID = '13Z3WJ0GRyQ1PTDX9ys7ZhuKVoJNIN_y9';

/**
 * 🔄 FUNCIÓN PARA SINCRONIZAR DESDE CODA HACIA DRIVE Y SHEETS
 * (Ejecutar manualmente desde el editor de Apps Script para actualizar todo)
 */
function sincronizarTodoDesdeCoda() {
  // --- LLAVE MAESTRA PARA PERMISOS ---
  // Esta línea no hace nada, pero OBLIGA a Google a pedirte permiso para CREAR archivos en Drive.
  DriveApp.getFiles(); 
  
  let folder;
  try {
    folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  } catch (e) {
    console.log("Error accediendo a la carpeta. Creando una nueva fallback...");
    const folderName = "Trazabilidad_Documentos_Drive";
    folder = DriveApp.getFoldersByName(folderName).hasNext() 
                 ? DriveApp.getFoldersByName(folderName).next() 
                 : DriveApp.createFolder(folderName);
  }
  console.log("Iniciando sincronización...");

  // 1. Sincronizar Genética
  sincronizarGenetica(folder);
  
  // 2. Sincronizar Equipo
  sincronizarEquipo();
  
  console.log("Sincronización completada con éxito.");
}

function sincronizarGenetica(folder) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_GENETICA);
  if (!sheet) sheet = ss.insertSheet(SHEET_GENETICA);

  const rows = getCodaRows("Tabla de CULTIVARES");
  let data = [["QR_ID", "Variedad", "Linaje", "Notas", "Imagen_URL", "Documentos_URL", "Quimiotipo", "Cannabinoides", "Terpenos"]];

  rows.forEach(fila => {
    const v = fila.values;
    const variedad = normalize(v["Variedad"]);
    if (!variedad) return;

    console.log("Procesando: " + variedad);

    const notas = uploadFile(v["Descripción INASE"], variedad + "_INASE.pdf", folder);
    const imagen = uploadFile(v["Imagen"], variedad + "_Imagen.jpg", folder);
    const docs = uploadFile(v["RNCP"], variedad + "_RNCP.pdf", folder);
    const cann = uploadFile(v["Perfil cannabinoides"], variedad + "_Cannabinoides.pdf", folder);
    const terp = uploadFile(v["Perfil terpenos"], variedad + "_Terpenos.pdf", folder);

    data.push([
      variedad, // QR_ID = Variedad por ahora
      variedad,
      normalize(v["PROPIEDAD y obtentores"]),
      notas,
      imagen,
      docs,
      normalize(v["Quimiotipo"]),
      cann,
      terp
    ]);
  });

  sheet.clear();
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
}

function sincronizarEquipo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_EQUIPO);
  if (!sheet) sheet = ss.insertSheet(SHEET_EQUIPO);

  const rows = getCodaRows("Table");
  let data = [["ID", "Nombre", "Cargo", "Email"]];

  rows.forEach(fila => {
    const v = fila.values;
    data.push([
      normalize(v["ID"]),
      normalize(v["Name"]),
      normalize(v["Cargo"]),
      normalize(v["Email"])
    ]);
  });

  sheet.clear();
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
}

// --- UTILIDADES ---

function getCodaRows(tableName) {
  const url = "https://coda.io/apis/v1/docs/" + DOC_ID + "/tables/" + encodeURIComponent(tableName) + "/rows?useColumnNames=true&valueFormat=rich";
  const options = { "headers": { "Authorization": "Bearer " + CODA_API_KEY } };
  const response = UrlFetchApp.fetch(url, options);
  return JSON.parse(response.getContentText()).items;
}

function normalize(val) {
  if (!val) return "";
  let res = "";
  if (Array.isArray(val)) {
    res = val.map(i => typeof i === 'object' ? (i.name || i.url) : i).join(", ");
  } else if (typeof val === 'object') {
    res = val.name || val.url || "";
  } else {
    res = String(val);
  }
  // Limpieza total de comillas (simples, dobles e inclinadas)
  return res.replace(/["'`]/g, "").trim();
}

function uploadFile(codaField, fileName, folder) {
  if (!codaField || !codaField[0] || !codaField[0].url) return "";
  const url = codaField[0].url;
  
  // Buscar si ya existe para no duplicar
  const existing = folder.getFilesByName(fileName);
  let file;
  if (existing.hasNext()) {
    file = existing.next();
  } else {
    try {
      const blob = UrlFetchApp.fetch(url).getBlob().setName(fileName);
      file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      console.log("Error subiendo " + fileName + ": " + e.message);
      return "";
    }
  }

  // Devolvemos el enlace de "miniatura" grande, que es más estable para mostrar en webs (evita bloqueos ORB)
  return "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000";
}

/**
 * 📥 doPost: Recibe datos de la App Móvil
 */
function doPost(e) {
  try {
    let data;
    if (e.postData.type === "application/json" || e.postData.type === "text/plain") {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }

    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const isIPM = data.accion === "Manejo Integrado de Plagas (IPM)";
    const targetSheetName = isIPM ? SHEET_PLAGAS : SHEET_LABORES;
    
    let sheet = activeSpreadsheet.getSheetByName(targetSheetName);
    if (!sheet) {
      sheet = activeSpreadsheet.insertSheet(targetSheetName);
      if (isIPM) {
        sheet.appendRow(["Timestamp", "QR_ID", "Operario", "Plaga", "Producto", "Dosis", "Metodo", "Foto_URL", "Detalles"]);
      } else {
        sheet.appendRow(["Timestamp", "QR_ID", "Operario", "Accion", "Valor", "Foto_URL"]);
      }
    }

    let valorFinal = data.valor || "";
    try {
        if (typeof valorFinal === 'string' && valorFinal.startsWith("{")) {
            const obj = JSON.parse(valorFinal);
            valorFinal = Object.entries(obj)
                .filter(([k,v]) => v !== "")
                .map(([k,v]) => `${k.toUpperCase()}: ${v}`)
                .join("\n");
        }
    } catch(err) {}

    let newRow;
    if (isIPM) {
      let pData = {};
      try { pData = JSON.parse(data.valor); } catch(err) {}
      newRow = [data.timestamp || new Date().toISOString(), data.qr_id || "S/N", data.operario || "Anonimo", pData.ipm_plaga || "Detectada", pData.ipm_producto || "-", pData.ipm_dosis || "-", pData.ipm_metodo || "-", data.foto_url || "", valorFinal];
    } else {
      newRow = [data.timestamp || new Date().toISOString(), data.qr_id || "S/N", data.operario || "Anonimo", data.accion || "Tarea", valorFinal, data.foto_url || ""];
    }

    sheet.appendRow(newRow);
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 📤 doGet: Consulta de datos (Visor)
 */
function doGet(e) {
  const output = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  const qrToSearch = e.parameter.qr;
  if (!qrToSearch) return output.setContent(JSON.stringify({ "status": "info", "message": "API v2.4 Activa." }));

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let foundData = null;
    let foundType = "Planta / Lote";

    const sheetGen = ss.getSheetByName(SHEET_GENETICA);
    if (sheetGen) {
      const gVals = sheetGen.getDataRange().getValues();
      const gHeaders = gVals[0].map(h => normalize(h)); // Limpiar cabeceras
      for (let i = 1; i < gVals.length; i++) {
        // Buscar por QR_ID (Col A) o Variedad (Col B)
        if (normalize(gVals[i][0]).toUpperCase() === qrToSearch.toUpperCase() || normalize(gVals[i][1]).toUpperCase() === qrToSearch.toUpperCase()) {
          foundData = {};
          for (let col = 0; col < gHeaders.length; col++) {
            foundData[gHeaders[col]] = normalize(gVals[i][col]); // Limpiar valores
          }
          foundType = "Genética";
          break;
        }
      }
    }

    if (!foundData) foundData = { "QR_ID": qrToSearch, "Variedad": "Lote en Seguimiento" };

    let historial = [];
    [SHEET_LABORES, SHEET_PLAGAS].forEach(name => {
      const s = ss.getSheetByName(name);
      if (s) {
        const v = s.getDataRange().getValues();
        const h = v[0].map(head => normalize(head)); // Limpiar cabeceras historial
        for (let i = 1; i < v.length; i++) {
          if (normalize(v[i][1]).toUpperCase() === qrToSearch.toUpperCase()) {
            let item = { _source: name === SHEET_PLAGAS ? "Pest" : "Labour", Acción: name === SHEET_PLAGAS ? "IPM" : normalize(v[i][3]) };
            for (let col = 0; col < h.length; col++) item[h[col]] = normalize(v[i][col]);
            historial.push(item);
          }
        }
      }
    });

    historial.sort((a,b) => new Date(b.Timestamp || 0) - new Date(a.Timestamp || 0));
    foundData["Historial"] = historial;

    return output.setContent(JSON.stringify({ status: "success", type: foundType, data: foundData }));
  } catch (error) {
    return output.setContent(JSON.stringify({ "status": "error", "message": error.message }));
  }
}

/**
 * 🧪 TEST DE ESCRITURA PARA FORZAR PERMISOS
 */
function testDeEscritura() {
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const file = folder.createFile("test.txt", "Prueba de permisos " + new Date().toISOString());
    console.log("✅ Test exitoso. Archivo creado: " + file.getName());
    file.setTrashed(true); // Lo mandamos a la papelera para no ensuciar
    console.log("Sincroniza ahora con la función principal.");
  } catch (e) {
    console.log("❌ Error en el test: " + e.message);
    console.log("Asegúrate de aceptar TODOS los permisos de Drive.");
  }
}


