import express from "express";
import fs from "fs/promises";
import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import os from "os";
import {
  createAgentResponse,
  connectMqttBroker,
  evaluateEmergency,
  exportIotPayload,
  getIotContextForNode,
  getIotHealth,
  getRoomHistory,
  getRoomStatus,
  getRoomSummary,
  ingestIotReading,
  initIotSystem,
  listEmergencyAlerts,
  acknowledgeEmergencyAlert,
  resolveEmergencyAlert,
  restoreIotPayload,
} from "./iot.js";
import { answerRagQuestion, getRagHealth, initRag, refreshRagIndex } from "./rag.js";
import {
  applyAutomationInstruction,
  getActuatorsHealth,
  initActuators,
  listActuators,
  parseAutomationInstruction,
  reloadActuators,
  setActuatorState,
  updateActuatorAutomation,
} from "./actuators.js";

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Servir la aplicación React (archivos estáticos compilados en /dist)
app.use(express.static(path.join(__dirname, "..", "dist")));

const SPREADSHEET_ID = "1FRbpDHOvbMurxaumeWO4sNPTABNAzU1THkycKwgVGcY";
const CREDENTIALS_PATH = path.join(__dirname, "..", "credenciales.json");
const LOCAL_MIRROR_DIR = path.join(__dirname, "..", "local_mirror");
const LOCAL_MIRROR_ASSETS_DIR = path.join(LOCAL_MIRROR_DIR, "assets");
const LOCAL_MIRROR_SNAPSHOT = path.join(LOCAL_MIRROR_DIR, "snapshot.json");
const LOCAL_MIRROR_MANIFEST = path.join(
  LOCAL_MIRROR_DIR,
  "asset-manifest.json",
);
const LOCAL_QUEUE_FILE = path.join(LOCAL_MIRROR_DIR, "sync-queue.json");
const LOCAL_HISTORY_FILE = path.join(LOCAL_MIRROR_DIR, "history.json");
const S1_MANUAL_PATH = path.join(__dirname, "..", "docs", "GUIA_USO_S1_ASISTENTE.md");

app.use("/local-mirror/assets", express.static(LOCAL_MIRROR_ASSETS_DIR));

let sheets;

const SHEET_DEFS = {
  genetica: {
    key: "genetica",
    sheetName: "Sheet_Genetica",
    gid: 897514151,
    typeLabel: "Genética Base",
    range: "Sheet_Genetica!A2:Z",
    idHeader: "ID Genética",
    headers: [
      "ID Genética",
      "Variedad",
      "Linaje",
      "Notas",
      "Imagen_URL",
      "Documentos_URL",
      "Quimiotipo",
      "Cannabinoides",
      "Imagen_Etiqueta",
      "Terpenos",
      "Notas_Extra",
    ],
  },
  madre: {
    key: "madre",
    sheetName: "Sheet_Madres",
    gid: 930533459,
    typeLabel: "Planta Madre",
    range: "Sheet_Madres!A2:H",
    idHeader: "ID Madre",
    headers: [
      "ID Madre",
      "Genética",
      "Ubicación",
      "Fecha",
      "Estado",
      "Imagen",
      "Notas",
    ],
  },
  clon: {
    key: "clon",
    sheetName: "Sheet_Clones",
    gid: 1787102091,
    typeLabel: "Clon",
    range: "Sheet_Clones!A2:H",
    idHeader: "ID Clon",
    headers: [
      "ID Clon",
      "Madre Origen",
      "Genética",
      "Fecha",
      "Cantidad",
      "Estado",
      "Notas",
    ],
  },
  vegetativo: {
    key: "vegetativo",
    sheetName: "Sheet_Lotes",
    gid: 1408405476,
    typeLabel: "Lote Vegetativo",
    range: "Sheet_Lotes!A2:H",
    idHeader: "ID Lote",
    headers: [
      "ID Lote",
      "ID Origen",
      "Ubicación",
      "Fecha",
      "Estado",
      "Cantidad",
      "Notas",
    ],
  },
  floracion: {
    key: "floracion",
    sheetName: "Sheet_Floracion",
    gid: 1048535752,
    typeLabel: "Floración",
    range: "Sheet_Floracion!A2:H",
    idHeader: "ID Lote",
    headers: [
      "ID Lote",
      "ID Origen",
      "Fecha",
      "Ubicación",
      "Estado",
      "Cantidad",
      "Notas",
    ],
  },
  cosecha: {
    key: "cosecha",
    sheetName: "Sheet_Cosecha",
    gid: 2130326294,
    typeLabel: "Cosecha",
    range: "Sheet_Cosecha!A2:H",
    idHeader: "ID Lote",
    headers: [
      "ID Lote",
      "ID Origen",
      "Fecha Cosecha",
      "Peso Húmedo (g)",
      "Peso Seco (g)",
      "Ubicación",
      "Notas",
    ],
  },
};

const SHEET_ORDER = [
  SHEET_DEFS.genetica,
  SHEET_DEFS.madre,
  SHEET_DEFS.clon,
  SHEET_DEFS.vegetativo,
  SHEET_DEFS.floracion,
  SHEET_DEFS.cosecha,
];

function cleanCell(value) {
  return typeof value === "string"
    ? value.replace(/^`+|`+$/g, "").trim()
    : value || "";
}

function toAssetSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(cleanCell(value));
}

function extFromContentType(contentType) {
  const normalized = String(contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (normalized === "image/jpeg") return ".jpg";
  if (normalized === "image/png") return ".png";
  if (normalized === "image/webp") return ".webp";
  if (normalized === "image/gif") return ".gif";
  if (normalized === "application/pdf") return ".pdf";
  if (normalized === "text/plain") return ".txt";
  return "";
}

function extFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname);
    return ext && ext.length <= 5 ? ext.toLowerCase() : "";
  } catch {
    return "";
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

function makeQueueOp(sheetName, row, meta = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "append",
    sheetName,
    row,
    createdAt: new Date().toISOString(),
    status: "pending",
    retries: 0,
    lastError: null,
    conflict: null,
    meta,
  };
}

function makeUpdateQueueOp(sheetName, row, meta = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "update",
    sheetName,
    row,
    createdAt: new Date().toISOString(),
    status: "pending",
    retries: 0,
    lastError: null,
    conflict: null,
    meta,
  };
}

function getIdFromRow(sheetName, row) {
  const def = SHEET_ORDER.find((sheet) => sheet.sheetName === sheetName);
  if (!def) return "";
  return cleanCell(row?.[0]);
}

function hasPendingOpForId(queue, qrId) {
  return (queue || []).some(
    (op) =>
      op?.meta?.qr_id?.toUpperCase() === qrId.toUpperCase() &&
      ["pending", "sync_error", "conflict"].includes(op.status),
  );
}

function mergeQueuedRowsIntoRanges(rangeData, queue) {
  const merged = Object.fromEntries(
    Object.entries(rangeData || {}).map(([key, value]) => [key, [...value]]),
  );

  for (const op of queue || []) {
    if (op.status !== "pending" && op.status !== "sync_error") continue;
    const def = SHEET_ORDER.find((sheet) => sheet.sheetName === op.sheetName);
    if (!def) continue;
    if (!merged[def.range]) merged[def.range] = [];

    if (op.type === "append") {
      merged[def.range].push(op.row);
      continue;
    }

    if (op.type === "update") {
      const targetId = getIdFromRow(op.sheetName, op.row).toUpperCase();
      const existingIndex = merged[def.range].findIndex(
        (row) => cleanCell(row[0]).toUpperCase() === targetId,
      );
      if (existingIndex !== -1) merged[def.range][existingIndex] = op.row;
    }
  }

  return merged;
}

async function loadQueue() {
  return readJson(LOCAL_QUEUE_FILE, []);
}

async function saveQueue(queue) {
  await writeJson(LOCAL_QUEUE_FILE, queue);
}

async function loadHistory() {
  return readJson(LOCAL_HISTORY_FILE, []);
}

async function appendHistoryEvent(event) {
  const history = await loadHistory();
  history.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...event,
  });
  await writeJson(LOCAL_HISTORY_FILE, history.slice(-2000));
}

function getActorFromReq(req) {
  return {
    user: req.headers["x-user-name"] || "Sistema",
    role: req.headers["x-user-role"] || "system",
  };
}

function createBackupPayload() {
  return {
    exportedAt: new Date().toISOString(),
    mirror: {
      source: MirrorCache.source,
      lastSync: MirrorCache.lastSync,
      ranges: MirrorCache.data,
      queue: MirrorCache.queue,
      assetManifest: MirrorCache.assetManifest,
    },
    iot: exportIotPayload(),
  };
}

function isValidBackupPayload(payload) {
  return Boolean(
    payload &&
    payload.mirror &&
    typeof payload.mirror === "object" &&
    payload.mirror.ranges &&
    typeof payload.mirror.ranges === "object" &&
    Array.isArray(payload.mirror.queue || []) &&
    typeof (payload.mirror.assetManifest || {}) === "object" &&
    typeof (payload.iot || {}) === "object",
  );
}

async function restoreBackupPayload(payload) {
  if (!isValidBackupPayload(payload)) {
    throw new Error("Backup inválido");
  }

  const ranges = payload.mirror.ranges || {};
  const queue = payload.mirror.queue || [];
  const assetManifest = payload.mirror.assetManifest || {};
  const source = payload.mirror.source || "restored";
  const lastSync = payload.mirror.lastSync || Date.now();

  await saveQueue(queue);
  await writeJson(LOCAL_MIRROR_MANIFEST, assetManifest);
  await writeJson(LOCAL_MIRROR_SNAPSHOT, {
    savedAt: new Date(lastSync).toISOString(),
    source,
    ranges,
  });

  const mergedRanges = mergeQueuedRowsIntoRanges(ranges, queue);
  MirrorCache.data = mergedRanges;
  MirrorCache.assetManifest = assetManifest;
  MirrorCache.queue = queue;
  MirrorCache.index = attachLocalAssetsToIndex(
    buildMirrorIndex(mergedRanges),
    assetManifest,
  );
  applyQueueStateToIndex(MirrorCache.index, queue);
  MirrorCache.lastSync = new Date(lastSync).getTime();
  MirrorCache.source = source;
  if (payload.iot) {
    restoreIotPayload(payload.iot);
  }

  await appendHistoryEvent({
    nodeId: "SYSTEM",
    sheetName: "BACKUP",
    action: "backup_restored",
    payload: {
      source,
      queue: queue.length,
      nodes: Object.keys(MirrorCache.index.byId || {}).length,
    },
  });
}

async function refreshQueueState() {
  MirrorCache.queue = await loadQueue();
  applyQueueStateToIndex(MirrorCache.index, MirrorCache.queue);
}

async function reloadMirrorFromCurrentSources() {
  if (sheets) {
    await MirrorCache.syncAll();
  } else {
    const localSnapshot = await loadLocalSnapshot();
    if (localSnapshot) {
      MirrorCache.data = localSnapshot.data;
      MirrorCache.index = localSnapshot.index;
      MirrorCache.assetManifest = localSnapshot.assetManifest;
      MirrorCache.queue = localSnapshot.queue || [];
      MirrorCache.lastSync = localSnapshot.lastSync;
      MirrorCache.source = localSnapshot.source || "disk";
    }
  }
  await refreshQueueState();
}

function rowToObject(headers, row) {
  return headers.reduce((acc, header, index) => {
    const value = cleanCell(row[index]);
    if (value !== "") acc[header] = value;
    return acc;
  }, {});
}

function normalizeImageUrl(url) {
  const value = cleanCell(url);
  if (!value) return "";
  if (!value.includes("drive.google.com")) return value;
  if (value.includes("thumbnail")) return value;
  const idMatch =
    value.match(/[?&]id=([^&]+)/) ||
    value.match(/file\/d\/([^\/]+)/) ||
    value.match(/id\/([^\/]+)/) ||
    value.match(/\/d\/([^\/]+)/);
  const id = idMatch ? idMatch[1] : null;
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000` : value;
}

function buildNode(def, row, rowIndex) {
  const data = rowToObject(def.headers, row);
  const id = cleanCell(row[0]);
  if (!id) return null;

  const parentId =
    def.key === "madre"
      ? cleanCell(row[1])
      : def.key === "clon"
        ? cleanCell(row[1])
        : def.key === "vegetativo" ||
            def.key === "floracion" ||
            def.key === "cosecha"
          ? cleanCell(row[1])
          : null;

  const parentType =
    def.key === "madre"
      ? "genetica"
      : def.key === "clon"
        ? "madre"
        : def.key === "vegetativo"
          ? "clon"
          : def.key === "floracion"
            ? "vegetativo"
            : def.key === "cosecha"
              ? "floracion"
              : null;

  const image = normalizeImageUrl(
    data.Imagen_URL || data.Imagen || data.Imagen_Etiqueta || "",
  );

  return {
    id,
    type: def.key,
    typeLabel: def.typeLabel,
    sheetName: def.sheetName,
    gid: def.gid,
    rowNumber: rowIndex + 2,
    parentId: parentId || null,
    parentType,
    displayName:
      data.Variedad ||
      data["Genética"] ||
      data["ID Lote"] ||
      data["ID Madre"] ||
      data["ID Clon"] ||
      id,
    image,
    localAssets: {},
    sheetLink: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/view#gid=${def.gid}&range=A${rowIndex + 2}`,
    data,
    raw: row,
  };
}

function buildMirrorIndex(rangeData) {
  const index = {
    byId: {},
    byType: {
      genetica: [],
      madre: [],
      clon: [],
      vegetativo: [],
      floracion: [],
      cosecha: [],
    },
    activity: [],
    chartData: Array(12).fill(0),
  };

  for (const def of SHEET_ORDER) {
    const rows = rangeData[def.range] || [];
    rows.forEach((row, rowIndex) => {
      const node = buildNode(def, row, rowIndex);
      if (!node) return;
      index.byId[node.id.toUpperCase()] = node;
      index.byType[def.key].push(node);
    });
  }

  const currentYear = new Date().getFullYear();

  index.byType.madre.forEach((node) => {
    if (node.data.Fecha) {
      index.activity.push({
        id: node.id,
        action: `Alta Madre: ${node.data["Genética"] || ""}`,
        date: node.data.Fecha,
        status: "ok",
        type: "madre",
      });
    }
  });

  index.byType.clon.forEach((node) => {
    if (node.data.Fecha) {
      index.activity.push({
        id: node.id,
        action: `Esquejado (x${node.data.Cantidad || 1})`,
        date: node.data.Fecha,
        status: "ok",
        type: "clon",
      });
    }
  });

  index.byType.vegetativo.forEach((node) => {
    if (node.data.Fecha) {
      index.activity.push({
        id: node.id,
        action: "Paso a Vegetativo",
        date: node.data.Fecha,
        status: "ok",
        type: "lote",
      });
    }
  });

  index.byType.floracion.forEach((node) => {
    if (node.data.Fecha) {
      index.activity.push({
        id: node.id,
        action: "Cambio a Floración",
        date: node.data.Fecha,
        status: "warning",
        type: "floracion",
      });
    }
  });

  index.byType.cosecha.forEach((node) => {
    if (node.data["Fecha Cosecha"]) {
      index.activity.push({
        id: node.id,
        action: `Cosecha: ${node.data["Peso Húmedo (g)"] || 0}g`,
        date: node.data["Fecha Cosecha"],
        status: "done",
        type: "cosecha",
      });
      const date = new Date(node.data["Fecha Cosecha"]);
      const peso = parseFloat(node.data["Peso Húmedo (g)"]) || 0;
      if (date.getFullYear() === currentYear && !Number.isNaN(peso)) {
        index.chartData[date.getMonth()] += peso;
      }
    }
  });

  index.activity.sort((a, b) => new Date(b.date) - new Date(a.date));
  return index;
}

function buildTraceLineage(index, startId) {
  const lineage = [];
  let current = index.byId[startId.toUpperCase()];

  while (current && current.parentId) {
    const parent = index.byId[current.parentId.toUpperCase()];
    if (!parent) break;
    lineage.push({
      id: parent.id,
      type: parent.typeLabel,
      image: parent.image,
      data: parent.data,
    });
    current = parent;
  }

  return lineage;
}

function attachLocalAssetsToIndex(index, manifest) {
  Object.values(index.byId).forEach((node) => {
    const assetMap = manifest[node.id] || {};
    node.localAssets = assetMap;
    if (assetMap.image) node.image = assetMap.image;
  });
  return index;
}

function applyQueueStateToIndex(index, queue) {
  const pendingById = new Map();

  for (const op of queue || []) {
    const qrId = op?.meta?.qr_id;
    if (!qrId) continue;
    pendingById.set(qrId.toUpperCase(), op);
  }

  Object.values(index.byId).forEach((node) => {
    const op = pendingById.get(node.id.toUpperCase());
    node.syncStatus = op
      ? op.status === "synced"
        ? "synced"
        : op.status === "conflict"
          ? "conflict"
          : op.status === "sync_error"
            ? "sync_error"
            : "pending_sync"
      : "synced";
    node.syncMeta = op || null;
  });

  return index;
}

async function saveLocalSnapshot(rangeData, assetManifest, source = "google") {
  await writeJson(LOCAL_MIRROR_SNAPSHOT, {
    savedAt: new Date().toISOString(),
    source,
    ranges: rangeData,
  });
  await writeJson(LOCAL_MIRROR_MANIFEST, assetManifest);
}

async function loadLocalSnapshot() {
  const snapshot = await readJson(LOCAL_MIRROR_SNAPSHOT, null);
  const manifest = await readJson(LOCAL_MIRROR_MANIFEST, {});
  const queue = await loadQueue();
  if (!snapshot?.ranges) return null;
  const mergedRanges = mergeQueuedRowsIntoRanges(snapshot.ranges, queue);
  const index = attachLocalAssetsToIndex(
    buildMirrorIndex(mergedRanges),
    manifest,
  );
  applyQueueStateToIndex(index, queue);
  return {
    data: mergedRanges,
    index,
    assetManifest: manifest,
    queue,
    lastSync: snapshot.savedAt ? new Date(snapshot.savedAt).getTime() : 0,
    source: snapshot.source || "disk",
  };
}

async function downloadAsset(url, nodeId, fieldName) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const ext =
    extFromContentType(response.headers.get("content-type")) ||
    extFromUrl(url) ||
    ".bin";
  const nodeDir = path.join(LOCAL_MIRROR_ASSETS_DIR, toAssetSlug(nodeId));
  await ensureDir(nodeDir);
  const fileName = `${toAssetSlug(fieldName)}${ext}`;
  const fullPath = path.join(nodeDir, fileName);
  await fs.writeFile(fullPath, Buffer.from(arrayBuffer));
  return `/local-mirror/assets/${toAssetSlug(nodeId)}/${fileName}`;
}

async function syncAssetsForIndex(index) {
  const manifest = {};
  const assetFields = [
    ["image", ["Imagen_URL", "Imagen", "Imagen_Etiqueta"]],
    ["documentos", ["Documentos_URL"]],
    ["cannabinoides", ["Cannabinoides"]],
    ["terpenos", ["Terpenos"]],
    ["notas", ["Notas"]],
  ];

  for (const node of Object.values(index.byId)) {
    const assetMap = {};
    for (const [assetKey, fields] of assetFields) {
      const sourceUrl = fields
        .map((field) => cleanCell(node.data[field]))
        .find(isHttpUrl);
      if (!sourceUrl) continue;
      try {
        assetMap[assetKey] = await downloadAsset(sourceUrl, node.id, assetKey);
      } catch {
        // Dejamos la URL remota como fallback si la descarga local falla.
      }
    }
    manifest[node.id] = assetMap;
  }

  return manifest;
}

async function appendLocalRow(sheetName, row) {
  const def = getSheetDefByName(sheetName);
  if (!def) throw new Error(`Hoja desconocida: ${sheetName}`);

  if (!MirrorCache.data[def.range]) MirrorCache.data[def.range] = [];
  MirrorCache.data[def.range].push(row);
  MirrorCache.index = buildMirrorIndex(MirrorCache.data);
  MirrorCache.index = attachLocalAssetsToIndex(
    MirrorCache.index,
    MirrorCache.assetManifest,
  );
  applyQueueStateToIndex(MirrorCache.index, MirrorCache.queue);
  await saveLocalSnapshot(MirrorCache.data, MirrorCache.assetManifest, "local");
  await appendHistoryEvent({
    nodeId: getIdFromRow(sheetName, row),
    sheetName,
    action: "local_append",
    payload: rowToObject(getSheetDefByName(sheetName)?.headers || [], row),
  });
}

async function updateLocalRow(sheetName, row) {
  const def = getSheetDefByName(sheetName);
  if (!def) throw new Error(`Hoja desconocida: ${sheetName}`);

  const targetId = getIdFromRow(sheetName, row).toUpperCase();
  if (!MirrorCache.data[def.range]) MirrorCache.data[def.range] = [];

  const rowIndex = MirrorCache.data[def.range].findIndex(
    (currentRow) => cleanCell(currentRow[0]).toUpperCase() === targetId,
  );
  if (rowIndex === -1) throw new Error(`No existe fila local para ${targetId}`);

  MirrorCache.data[def.range][rowIndex] = row;
  MirrorCache.index = buildMirrorIndex(MirrorCache.data);
  MirrorCache.index = attachLocalAssetsToIndex(
    MirrorCache.index,
    MirrorCache.assetManifest,
  );
  applyQueueStateToIndex(MirrorCache.index, MirrorCache.queue);
  await saveLocalSnapshot(MirrorCache.data, MirrorCache.assetManifest, "local");
  await appendHistoryEvent({
    nodeId: getIdFromRow(sheetName, row),
    sheetName,
    action: "local_update",
    payload: rowToObject(getSheetDefByName(sheetName)?.headers || [], row),
  });
}

async function processSyncQueue() {
  if (!sheets) return { synced: 0, pending: 0 };
  const queue = await loadQueue();
  let synced = 0;

  for (const op of queue) {
    if (!["append", "update"].includes(op.type)) continue;
    if (!["pending", "sync_error"].includes(op.status)) continue;

    try {
      const def = getSheetDefByName(op.sheetName);
      if (!def) {
        op.status = "conflict";
        op.conflict = { reason: "unknown_sheet" };
        continue;
      }

      const remoteRows = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: def.range,
      });
      const targetId = getIdFromRow(op.sheetName, op.row).toUpperCase();
      const existsRemote = (remoteRows.data.values || []).some(
        (row) => cleanCell(row[0]).toUpperCase() === targetId,
      );

      if (
        op.type === "append" &&
        existsRemote &&
        op.resolution !== "keep_local"
      ) {
        const remoteRow = (remoteRows.data.values || []).find(
          (row) => cleanCell(row[0]).toUpperCase() === targetId,
        );
        op.status = "conflict";
        op.conflict = {
          reason: "duplicate_remote_id",
          qr_id: targetId,
          localData: rowToObject(def.headers, op.row),
          remoteData: rowToObject(def.headers, remoteRow || []),
        };
        op.lastError = "ID ya existe en Google Sheets";
        await appendHistoryEvent({
          nodeId: op.meta?.qr_id || targetId,
          sheetName: op.sheetName,
          action: "sync_conflict",
          payload: { queueId: op.id, reason: op.conflict.reason },
        });
        continue;
      }

      if (op.type === "append") {
        if (existsRemote && op.resolution === "keep_local") {
          const remoteRowIndex = (remoteRows.data.values || []).findIndex(
            (row) => cleanCell(row[0]).toUpperCase() === targetId,
          );
          const remoteRowNumber = remoteRowIndex + 2;
          const endColumn = String.fromCharCode(
            64 + Math.max(def.headers.length, op.row.length),
          );

          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${op.sheetName}!A${remoteRowNumber}:${endColumn}${remoteRowNumber}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [op.row] },
          });
        } else {
          await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${op.sheetName}!A1`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [op.row] },
          });
        }
      }

      if (op.type === "update") {
        if (!existsRemote) {
          op.status = "sync_error";
          op.lastError = "La fila remota aún no existe para actualizar";
          op.retries = (op.retries || 0) + 1;
          continue;
        }

        const remoteRowIndex = (remoteRows.data.values || []).findIndex(
          (row) => cleanCell(row[0]).toUpperCase() === targetId,
        );
        const remoteRowNumber = remoteRowIndex + 2;
        const endColumn = String.fromCharCode(
          64 + Math.max(def.headers.length, op.row.length),
        );

        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${op.sheetName}!A${remoteRowNumber}:${endColumn}${remoteRowNumber}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [op.row] },
        });
      }

      op.status = "synced";
      op.syncedAt = new Date().toISOString();
      op.lastError = null;
      op.conflict = null;
      await appendHistoryEvent({
        nodeId: op.meta?.qr_id || getIdFromRow(op.sheetName, op.row),
        sheetName: op.sheetName,
        action:
          op.type === "update"
            ? "remote_update_synced"
            : "remote_append_synced",
        payload: { queueId: op.id },
      });
      synced += 1;
    } catch (error) {
      op.status = "sync_error";
      op.retries = (op.retries || 0) + 1;
      op.lastError = error.message;
      await appendHistoryEvent({
        nodeId: op.meta?.qr_id || getIdFromRow(op.sheetName, op.row),
        sheetName: op.sheetName,
        action: "sync_error",
        payload: { queueId: op.id, error: error.message },
      });
    }
  }

  await saveQueue(queue);
  return {
    synced,
    pending: queue.filter(
      (op) => op.status === "pending" || op.status === "sync_error",
    ).length,
  };
}

function serializeNodeForOption(node) {
  return {
    id: node.id,
    type: node.type,
    typeLabel: node.typeLabel,
    displayName: node.displayName,
    parentId: node.parentId,
    parentType: node.parentType,
    image: node.image,
    syncStatus: node.syncStatus || "synced",
    syncMeta: node.syncMeta || null,
    sheetLink: node.sheetLink,
    data: node.data,
  };
}

function buildRowFromNodeData(def, existingRow, patchData) {
  return def.headers.map((header, index) => {
    if (index === 0) return cleanCell(existingRow[0]);
    if (Object.prototype.hasOwnProperty.call(patchData, header)) {
      return patchData[header];
    }
    return existingRow[index] || "";
  });
}

function getSheetDefByName(sheetName) {
  return SHEET_ORDER.find((sheet) => sheet.sheetName === sheetName) || null;
}

function getTwoDigitYear(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  return date.getFullYear().toString().slice(-2);
}

function getMotherPrefix(geneticaId) {
  return cleanCell(geneticaId).slice(0, 3).toUpperCase();
}

function getNextMotherId(index, geneticaId, fecha) {
  const yy = getTwoDigitYear(fecha);
  const motherPrefix = getMotherPrefix(geneticaId);
  const prefix = `${motherPrefix}-PM-`;
  const seq =
    index.byType.madre
      .filter(
        (node) => node.id.startsWith(prefix) && node.id.endsWith(`-${yy}`),
      )
      .map((node) => Number(node.id.match(/-PM-(\d+)-\d{2}$/)?.[1] || 0))
      .reduce((max, n) => Math.max(max, n), 0) + 1;
  return `${motherPrefix}-PM-${seq}-${yy}`;
}

function getNextCloneId(index, madreId) {
  const prefix = `${madreId}-CL-`;
  const seq =
    index.byType.clon
      .filter((node) => node.id.startsWith(prefix))
      .map((node) => Number(node.id.match(/-CL-(\d+)$/)?.[1] || 0))
      .reduce((max, n) => Math.max(max, n), 0) + 1;
  return `${madreId}-CL-${seq}`;
}

function getDerivedId(type, origenId) {
  if (type === "lote") return `${origenId}-V`;
  if (type === "floracion") return `${origenId}F`;
  if (type === "cosecha") return `${origenId}C`;
  return "";
}

// ==========================================
// 🚀 SISTEMA DE COPIA ESPEJO (CACHÉ EN RAM)
// ==========================================
// Mantiene una copia local de las hojas para devolver búsquedas y lecturas en milisegundos
// sin saturar la cuota de peticiones de la API de Google Drive.

const MirrorCache = {
  data: {},
  index: buildMirrorIndex({}),
  assetManifest: {},
  queue: [],
  lastSync: 0,
  isSyncing: false,
  isSyncingQueue: false,
  source: "memory",
  // TTL = Tiempo de vida de la copia antes de forzar otra descarga (ej: 60 seg = 60000 ms)
  TTL: 60000,

  async getRange(range) {
    // Si los datos están vigentes en la copia espejo, servimos al instante desde RAM
    if (this.data[range] && Date.now() - this.lastSync < this.TTL) {
      return this.data[range];
    }

    // Si no están, o han caducado, los forzamos a actualizar de Google Drive
    await this.syncAll();
    return this.data[range] || [];
  },

  async syncAll() {
    if (this.isSyncing) return; // Evitar colisiones si ya se está actualizando
    if (!sheets) return;

    this.isSyncing = true;
    try {
      const ranges = [
        "Sheet_Genetica!A2:Z",
        "Sheet_Madres!A2:H",
        "Sheet_Clones!A2:H",
        "Sheet_Lotes!A2:H",
        "Sheet_Floracion!A2:H",
        "Sheet_Cosecha!A2:H",
      ];

      // Batch Get: Traemos todas las pestañas de golpe en 1 sola llamada a la red (Ultra Rápido)
      const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: SPREADSHEET_ID,
        ranges: ranges,
      });

      const results = response.data.valueRanges;
      if (results && results.length > 0) {
        // Guardamos explícitamente usando la misma key que pedimos, no la que devuelve Google
        // (porque Google añade el límite real de filas como A2:Z1000)
        ranges.forEach((range, index) => {
          this.data[range] = results[index].values || [];
        });
        this.queue = await loadQueue();
        this.data = mergeQueuedRowsIntoRanges(this.data, this.queue);
        this.index = buildMirrorIndex(this.data);
        applyQueueStateToIndex(this.index, this.queue);
        this.lastSync = Date.now();
        this.source = "google";
        await saveLocalSnapshot(this.data, this.assetManifest, this.source);

        try {
          this.assetManifest = await syncAssetsForIndex(this.index);
          this.index = attachLocalAssetsToIndex(this.index, this.assetManifest);
          applyQueueStateToIndex(this.index, this.queue);
          await saveLocalSnapshot(this.data, this.assetManifest, this.source);
        } catch (assetError) {
          console.warn(
            `[ESPEJO] Assets locales incompletos: ${assetError.message}`,
          );
        }

        console.log(
          `[ESPEJO] Sincronización completa: ${new Date().toLocaleTimeString()}`,
        );
      }
    } catch (e) {
      console.error(`[ESPEJO] Error sincronizando hojas:`, e.message);
      if (!Object.keys(this.data).length) {
        const localSnapshot = await loadLocalSnapshot();
        if (localSnapshot) {
          this.data = localSnapshot.data;
          this.index = localSnapshot.index;
          this.assetManifest = localSnapshot.assetManifest;
          this.queue = localSnapshot.queue || [];
          this.lastSync = localSnapshot.lastSync;
          this.source = "disk";
        }
      }
    } finally {
      this.isSyncing = false;
    }
  },

  // Limpia el caché para forzar una lectura obligatoria inmediata (útil después de un POST)
  invalidate() {
    this.index = buildMirrorIndex({});
    this.assetManifest = {};
    this.queue = [];
    this.lastSync = 0;
    this.source = "memory";
  },
};
// ==========================================

async function initGoogle() {
  try {
    await initIotSystem(path.join(__dirname, ".."));
    await initRag(path.join(__dirname, ".."));
    await initActuators(path.join(__dirname, ".."), { getRoomStatus });
    connectMqttBroker();
    const localSnapshot = await loadLocalSnapshot();
    if (localSnapshot) {
      MirrorCache.data = localSnapshot.data;
      MirrorCache.index = localSnapshot.index;
      MirrorCache.assetManifest = localSnapshot.assetManifest;
      MirrorCache.queue = localSnapshot.queue || [];
      MirrorCache.lastSync = localSnapshot.lastSync;
      MirrorCache.source = localSnapshot.source || "disk";
      console.log("[ESPEJO] Snapshot local cargado desde disco");
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const client = await auth.getClient();
    sheets = google.sheets({ version: "v4", auth: client });
    console.log("✅ Google Sheets API conectada");

    // Al encender el servidor, hacemos la primera carga espejo en segundo plano
    MirrorCache.syncAll();
    processSyncQueue();
    setInterval(() => {
      processSyncQueue().catch(() => {});
    }, 30000);
  } catch (err) {
    console.error("❌ Error conectando Google:", err.message);
  }
}

// GET options
app.get("/api/options", async (req, res) => {
  const fallbackVariedades = [
    "OG Kush",
    "Blue Dream",
    "White Widow",
    "Sour Diesel",
  ];

  if (!sheets && !Object.keys(MirrorCache.index.byId || {}).length) {
    return res.json({
      status: "success",
      options: {
        variedades: fallbackVariedades,
        madres: [],
        clones: [],
        vegetativos: [],
        floraciones: [],
      },
    });
  }

  try {
    await MirrorCache.syncAll();
    const { index } = MirrorCache;

    const geneticasFull = index.byType.genetica.map((node) => ({
      id: node.id,
      variedad: node.data.Variedad || node.id,
      linaje: node.data.Linaje || "",
      notas: node.data.Notas || "",
      imagen_url: node.image || "",
      documentos_url: node.data.Documentos_URL || "",
      quimiotipo: node.data.Quimiotipo || "",
      cannabinoides: node.data.Cannabinoides || "",
      terpenos: node.data.Terpenos || "",
      notas_extra: node.data.Notas_Extra || "",
      sheetLink: node.sheetLink,
    }));

    const geneticasSheets = geneticasFull
      .map((g) => g.variedad)
      .filter(Boolean);

    res.json({
      status: "success",
      options: {
        variedades:
          geneticasSheets.length > 0 ? geneticasSheets : fallbackVariedades,
        geneticasFull,
        madres: index.byType.madre.map((node) => ({
          ...serializeNodeForOption(node),
          variedad: node.data["Genética"] || "",
        })),
        clones: index.byType.clon.map((node) => ({
          ...serializeNodeForOption(node),
          variedad: node.data["Genética"] || "",
        })),
        vegetativos: index.byType.vegetativo.map((node) =>
          serializeNodeForOption(node),
        ),
        floraciones: index.byType.floracion.map((node) =>
          serializeNodeForOption(node),
        ),
        activity: index.activity.slice(0, 5),
        chartData: index.chartData,
      },
    });
  } catch (error) {
    console.error("Error general /api/options:", error.message);
    res.json({
      status: "success",
      options: {
        variedades: fallbackVariedades,
        madres: [],
        clones: [],
        vegetativos: [],
        floraciones: [],
      },
    });
  }
});

// POST entity
app.post("/api/entity", async (req, res) => {
  const actor = getActorFromReq(req);
  const {
    type,
    qr_id,
    variedad,
    cantidad,
    ubicacion,
    fecha,
    madre_id,
    origen_id,
    peso_humedo,
    notas,
    linaje,
    documentos_url,
    quimiotipo,
    cannabinoides,
    terpenos,
    imagen_url,
  } = req.body;

  await MirrorCache.syncAll();
  const { index } = MirrorCache;
  let finalQrId = qr_id;
  let finalVariedad = variedad;
  const existingQueue = await loadQueue();

  if (type === "genetica") {
    finalQrId = cleanCell(qr_id || variedad).toUpperCase();
    finalVariedad = cleanCell(variedad);
    if (!finalQrId || !finalVariedad) {
      return res.status(400).json({
        status: "error",
        message: "La genética requiere ID y variedad",
      });
    }
  }

  if (type === "madre") {
    const geneticaNode =
      index.byId[(variedad || "").toUpperCase()] ||
      index.byType.genetica.find(
        (node) =>
          node.data.Variedad?.toUpperCase() === (variedad || "").toUpperCase(),
      );
    if (!geneticaNode) {
      return res
        .status(400)
        .json({ status: "error", message: "Genética no válida" });
    }
    finalVariedad = geneticaNode.id;
    finalQrId = getNextMotherId(index, geneticaNode.id, fecha);
  }

  if (type === "clon") {
    const madreNode = index.byId[(madre_id || "").toUpperCase()];
    if (!madreNode || madreNode.type !== "madre") {
      return res
        .status(400)
        .json({ status: "error", message: "Madre origen no válida" });
    }
    finalVariedad = madreNode.data["Genética"] || madreNode.parentId || "";
    finalQrId = getNextCloneId(index, madreNode.id);
  }

  if (type === "lote") {
    const originNode = index.byId[(origen_id || "").toUpperCase()];
    if (!originNode || originNode.type !== "clon") {
      return res
        .status(400)
        .json({
          status: "error",
          message: "El vegetativo debe originarse desde un clon válido",
        });
    }
    finalQrId = getDerivedId(type, originNode.id);
  }

  if (type === "floracion") {
    const originNode = index.byId[(origen_id || "").toUpperCase()];
    if (!originNode || originNode.type !== "vegetativo") {
      return res
        .status(400)
        .json({
          status: "error",
          message: "La floración debe originarse desde un vegetativo válido",
        });
    }
    finalQrId = getDerivedId(type, originNode.id);
  }

  if (type === "cosecha") {
    const originNode = index.byId[(origen_id || "").toUpperCase()];
    if (!originNode || originNode.type !== "floracion") {
      return res
        .status(400)
        .json({
          status: "error",
          message: "La cosecha debe originarse desde una floración válida",
        });
    }
    finalQrId = getDerivedId(type, originNode.id);
  }

  let sheetName, row;
  if (type === "genetica") {
    sheetName = "Sheet_Genetica";
    row = [
      finalQrId,
      finalVariedad,
      linaje || "",
      notas || "",
      imagen_url || "",
      documentos_url || "",
      quimiotipo || "",
      cannabinoides || "",
      "",
      terpenos || "",
      "",
    ];
  } else if (type === "madre") {
    sheetName = "Sheet_Madres";
    row = [
      finalQrId,
      finalVariedad,
      ubicacion,
      fecha,
      "Vigoroso",
      "",
      notas || "",
    ];
  } else if (type === "clon") {
    sheetName = "Sheet_Clones";
    row = [
      finalQrId,
      madre_id,
      finalVariedad,
      fecha,
      cantidad,
      "Enraizando",
      "",
    ];
  } else if (type === "lote") {
    sheetName = "Sheet_Lotes";
    row = [finalQrId, origen_id, ubicacion, fecha, "Crecimiento", cantidad, ""];
  } else if (type === "floracion") {
    sheetName = "Sheet_Floracion";
    row = [finalQrId, origen_id, fecha, ubicacion, "Floración", ""];
  } else if (type === "cosecha") {
    sheetName = "Sheet_Cosecha";
    row = [finalQrId, origen_id, fecha, peso_humedo, "", ubicacion, ""];
  } else {
    return res.status(400).json({ status: "error", message: "Tipo no válido" });
  }

  if (
    index.byId[finalQrId.toUpperCase()] ||
    hasPendingOpForId(existingQueue, finalQrId)
  ) {
    return res.status(409).json({
      status: "error",
      message: `El ID ${finalQrId} ya existe en local o está pendiente de sincronización`,
    });
  }

  try {
    await appendLocalRow(sheetName, row);

    const queue = await loadQueue();
    const op = makeQueueOp(sheetName, row, { type, qr_id: finalQrId });
    queue.push(op);
    await saveQueue(queue);
    MirrorCache.queue = queue;

    const syncResult = await processSyncQueue();
    MirrorCache.queue = await loadQueue();

    res.json({
      status: "success",
      message: `${type} creado correctamente en local`,
      qr_id: finalQrId,
      sync: {
        mode: "local_first",
        queued: op.id,
        pending: syncResult.pending,
      },
    });
    await appendHistoryEvent({
      nodeId: finalQrId,
      sheetName,
      action: "entity_created_via_ui",
      payload: { type, actor },
    });
  } catch (error) {
    console.error("Error POST /api/entity:", error.message);
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.patch("/api/node/:id", async (req, res) => {
  const targetId = req.params.id;
  const patchData = req.body?.data || {};
  const actor = getActorFromReq(req);

  await MirrorCache.syncAll();
  const node = MirrorCache.index.byId[targetId.toUpperCase()];
  if (!node) {
    return res
      .status(404)
      .json({ status: "error", message: "Nodo no encontrado" });
  }

  if (["pending_sync", "conflict"].includes(node.syncStatus)) {
    return res.status(409).json({
      status: "error",
      message:
        "No se puede editar mientras el nodo tiene cambios pendientes o conflictos",
    });
  }

  const def = getSheetDefByName(node.sheetName);
  if (!def) {
    return res
      .status(400)
      .json({ status: "error", message: "Hoja no soportada" });
  }

  const filteredPatch = Object.fromEntries(
    Object.entries(patchData).filter(([key]) => key !== def.idHeader),
  );
  const updatedRow = buildRowFromNodeData(def, node.raw, filteredPatch);

  try {
    await updateLocalRow(node.sheetName, updatedRow);

    const queue = await loadQueue();
    const op = makeUpdateQueueOp(node.sheetName, updatedRow, {
      qr_id: node.id,
      type: node.type,
      mode: "update",
    });
    queue.push(op);
    await saveQueue(queue);
    await refreshQueueState();

    const syncResult = await processSyncQueue();
    await refreshQueueState();

    await appendHistoryEvent({
      nodeId: node.id,
      sheetName: node.sheetName,
      action: "entity_updated_via_ui",
      payload: { actor },
    });

    return res.json({
      status: "success",
      message: `${node.id} actualizado en local`,
      id: node.id,
      sync: {
        mode: "local_first_update",
        queued: op.id,
        pending: syncResult.pending,
      },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// GET search
app.get("/api/search/:qr", async (req, res) => {
  const actor = getActorFromReq(req);
  if (!sheets && !Object.keys(MirrorCache.index.byId || {}).length)
    return res
      .status(503)
      .json({ status: "error", message: "Google Sheets no conectado" });
  const qr = req.params.qr;

  try {
    await MirrorCache.syncAll();
    const node = MirrorCache.index.byId[qr.toUpperCase()];

    if (node) {
      await appendHistoryEvent({
        nodeId: node.id,
        sheetName: node.sheetName,
        action: "node_view",
        payload: { source: "search_api", actor },
      });
      const linaje = buildTraceLineage(MirrorCache.index, node.id);
      return res.json({
        status: "success",
        type: node.typeLabel,
        sheetLink: node.sheetLink,
        node: {
          id: node.id,
          type: node.type,
          typeLabel: node.typeLabel,
          image: node.image,
          parentId: node.parentId,
          parentType: node.parentType,
          rowNumber: node.rowNumber,
          sheetName: node.sheetName,
          syncStatus: node.syncStatus || "synced",
          syncMeta: node.syncMeta || null,
        },
        data: node.data,
        linaje: linaje.length > 0 ? linaje : null,
        iot: getIotContextForNode(node),
      });
    }

    res.json({
      status: "not_found",
      message: "El código QR escaneado no está registrado en el sistema.",
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.post("/api/iot/ingest", async (req, res) => {
  try {
    const result = ingestIotReading(req.body || {});
    return res.json(createAgentResponse("S2_IOT", result));
  } catch (error) {
    return res.status(400).json({
      status: "error",
      generatedAt: new Date().toISOString(),
      traceId: `iot-error-${Date.now()}`,
      message: error.message,
    });
  }
});

app.get("/api/iot/health", (req, res) => {
  return res.json({
    status: "success",
    generatedAt: new Date().toISOString(),
    traceId: `iot-health-${Date.now()}`,
    ...getIotHealth(),
  });
});

app.get("/api/agents/iot/rooms/:room/status", (req, res) => {
  const status = getRoomStatus(req.params.room, req.query.window || "24h");
  if (!status) {
    return res.status(404).json({ status: "error", message: "Sala no encontrada" });
  }
  return res.json(createAgentResponse("S2_IOT", status));
});

app.get("/api/agents/iot/rooms/:room/summary", (req, res) => {
  const summary = getRoomSummary(req.params.room, req.query.window || "24h");
  if (!summary) {
    return res.status(404).json({ status: "error", message: "Sala no encontrada" });
  }
  return res.json(createAgentResponse("S2_IOT", summary));
});

app.get("/api/agents/iot/rooms/:room/history", (req, res) => {
  const history = getRoomHistory(req.params.room, {
    from: req.query.from,
    to: req.query.to,
    window: req.query.window,
    resolution: req.query.resolution,
  });
  if (!history) {
    return res.status(404).json({ status: "error", message: "Sala no encontrada" });
  }
  return res.json({
    status: "success",
    generatedAt: new Date().toISOString(),
    traceId: `iot-history-${Date.now()}`,
    ...history,
  });
});

app.post("/api/agents/emergency/evaluate", (req, res) => {
  try {
    const result = evaluateEmergency(req.body || {});
    return res.json(createAgentResponse("S2_E", result));
  } catch (error) {
    return res.status(400).json({ status: "error", message: error.message });
  }
});

app.get("/api/agents/emergency/active", (req, res) => {
  const room = req.query.room || null;
  return res.json({
    status: "success",
    generatedAt: new Date().toISOString(),
    traceId: `emergency-active-${Date.now()}`,
    items: listEmergencyAlerts({ roomName: room, activeOnly: true }),
  });
});

app.get("/api/agents/emergency/history", (req, res) => {
  const room = req.query.room || null;
  const window = req.query.window || null;
  return res.json({
    status: "success",
    generatedAt: new Date().toISOString(),
    traceId: `emergency-history-${Date.now()}`,
    room,
    window,
    items: listEmergencyAlerts({ roomName: room, window }),
  });
});

app.post("/api/agents/emergency/:id/ack", (req, res) => {
  try {
    const actor = req.headers["x-user-name"] || req.headers["x-user-role"] || "system";
    const row = acknowledgeEmergencyAlert(req.params.id, actor);
    return res.json({
      status: "success",
      generatedAt: new Date().toISOString(),
      traceId: `emergency-ack-${Date.now()}`,
      id: row.id,
    });
  } catch (error) {
    return res.status(400).json({ status: "error", message: error.message });
  }
});

app.post("/api/agents/emergency/:id/resolve", (req, res) => {
  try {
    const note = req.body?.note || "Resuelta manualmente";
    const actor = req.headers["x-user-name"] || req.headers["x-user-role"] || "system";
    const row = resolveEmergencyAlert(req.params.id, note, actor);
    return res.json({
      status: "success",
      generatedAt: new Date().toISOString(),
      traceId: `emergency-resolve-${Date.now()}`,
      id: row.id,
    });
  } catch (error) {
    return res.status(400).json({ status: "error", message: error.message });
  }
});

app.post("/api/agents/chat", async (req, res) => {
  try {
    const question = String(req.body?.question || "").trim();
    if (!question) {
      return res.status(400).json({ status: "error", message: "Falta la pregunta del usuario." });
    }

    await MirrorCache.syncAll();
    const room = req.body?.context?.room || null;
    const qrId = req.body?.context?.qrId || null;
    const geneticaNodes = MirrorCache.index?.byType?.genetica || [];
    const geneticsContext = {
      total: geneticaNodes.length,
      varieties: geneticaNodes
        .map((node) => node.data?.Variedad || node.id)
        .filter(Boolean)
        .slice(0, 30),
    };
    const roomStatus = room ? getRoomStatus(room, "24h") : null;
    const activeAlerts = room ? listEmergencyAlerts({ roomName: room, activeOnly: true }) : [];
    let qrContext = null;

    if (qrId) {
      const node = MirrorCache.index.byId[String(qrId).toUpperCase()];
      if (node) {
        qrContext = {
          type: node.typeLabel,
          node: {
            id: node.id,
            type: node.type,
          },
          iot: getIotContextForNode(node),
        };
      }
    }

    const result = await answerRagQuestion({
      question,
      roomStatus,
      qrContext,
      activeAlerts,
      geneticsContext,
    });
    return res.json(createAgentResponse("S1_CHAT", result));
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/api/agents/chat/health", (req, res) => {
  return res.json({
    status: "success",
    generatedAt: new Date().toISOString(),
    traceId: `chat-health-${Date.now()}`,
    ...getRagHealth(),
  });
});

app.post("/api/agents/chat/reindex", async (req, res) => {
  try {
    const result = await refreshRagIndex();
    return res.json({
      status: "success",
      generatedAt: new Date().toISOString(),
      traceId: `chat-reindex-${Date.now()}`,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/api/agents/chat/manual", async (req, res) => {
  try {
    const content = await fs.readFile(S1_MANUAL_PATH, "utf8");
    return res.json({
      status: "success",
      generatedAt: new Date().toISOString(),
      traceId: `chat-manual-${Date.now()}`,
      title: "Guía de Uso del Agente S1",
      path: "docs/GUIA_USO_S1_ASISTENTE.md",
      content,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/api/trace/:qr", async (req, res) => {
  try {
    await MirrorCache.syncAll();
    const node = MirrorCache.index.byId[req.params.qr.toUpperCase()];
    if (!node) {
      return res
        .status(404)
        .json({ status: "not_found", message: "Nodo no encontrado" });
    }

    return res.json({
      status: "success",
      current: node,
      lineage: buildTraceLineage(MirrorCache.index, node.id),
      iot: getIotContextForNode(node),
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  const iot = getIotHealth();
  const actuators = getActuatorsHealth();
  res.json({
    status: "ok",
    sheets_connected: !!sheets,
    local_ip: getLocalIp(),
    mirror: {
      source: MirrorCache.source,
      last_sync: MirrorCache.lastSync
        ? new Date(MirrorCache.lastSync).toISOString()
        : null,
      nodes: Object.keys(MirrorCache.index.byId || {}).length,
      assets: Object.keys(MirrorCache.assetManifest || {}).length,
      pending_ops: (MirrorCache.queue || []).filter(
        (op) => op.status === "pending" || op.status === "sync_error",
      ).length,
      conflict_ops: (MirrorCache.queue || []).filter(
        (op) => op.status === "conflict",
      ).length,
    },
    iot,
    actuators,
  });
});

app.get("/api/actuators", async (req, res) => {
  try {
    const items = await listActuators();
    return res.json({
      status: "success",
      generatedAt: new Date().toISOString(),
      traceId: `actuators-${Date.now()}`,
      items,
      health: getActuatorsHealth(),
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

app.post("/api/actuators/reload", async (req, res) => {
  try {
    const result = await reloadActuators();
    return res.json({
      status: "success",
      generatedAt: new Date().toISOString(),
      traceId: `actuators-reload-${Date.now()}`,
      ...result,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
});

app.post("/api/actuators/:id/on", async (req, res) => {
  try {
    const actor = req.headers["x-user-name"] || req.headers["x-user-role"] || "system";
    const result = await setActuatorState(req.params.id, true, actor);
    return res.json({
      status: "success",
      generatedAt: new Date().toISOString(),
      traceId: `actuator-on-${Date.now()}`,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({ status: "error", message: error.message });
  }
});

app.post("/api/actuators/:id/off", async (req, res) => {
  try {
    const actor = req.headers["x-user-name"] || req.headers["x-user-role"] || "system";
    const result = await setActuatorState(req.params.id, false, actor);
    return res.json({
      status: "success",
      generatedAt: new Date().toISOString(),
      traceId: `actuator-off-${Date.now()}`,
      ...result,
    });
  } catch (error) {
    return res.status(400).json({ status: "error", message: error.message });
  }
});

app.post("/api/actuators/:id/automation", async (req, res) => {
  try {
    const actuator = await updateActuatorAutomation(req.params.id, req.body || {});
    return res.json({
      status: "success",
      generatedAt: new Date().toISOString(),
      traceId: `actuator-automation-${Date.now()}`,
      actuator,
    });
  } catch (error) {
    return res.status(400).json({ status: "error", message: error.message });
  }
});

app.post("/api/actuators/automation/parse", async (req, res) => {
  try {
    const instruction = String(req.body?.instruction || "").trim();
    if (!instruction) {
      return res.status(400).json({ status: "error", message: "Falta la instrucción de automatización." });
    }
    const parsed = parseAutomationInstruction(instruction);
    return res.json({
      status: "success",
      generatedAt: new Date().toISOString(),
      traceId: `actuator-parse-${Date.now()}`,
      parsed,
    });
  } catch (error) {
    return res.status(400).json({ status: "error", message: error.message });
  }
});

app.post("/api/actuators/automation/apply", async (req, res) => {
  try {
    const instruction = String(req.body?.instruction || "").trim();
    if (!instruction) {
      return res.status(400).json({ status: "error", message: "Falta la instrucción de automatización." });
    }
    const actor = getActorFromReq(req);
    const actuator = await applyAutomationInstruction(instruction);
    await appendHistoryEvent({
      action: "actuator_automation_updated",
      nodeId: actuator.id,
      actor,
      details: {
        source: "chat_automation",
        automation: actuator.automation,
      },
    });
    return res.json({
      status: "success",
      generatedAt: new Date().toISOString(),
      traceId: `actuator-apply-${Date.now()}`,
      actuator,
    });
  } catch (error) {
    return res.status(400).json({ status: "error", message: error.message });
  }
});

app.get("/api/mirror/status", (req, res) => {
  res.json({
    status: "success",
    source: MirrorCache.source,
    lastSync: MirrorCache.lastSync,
    ranges: Object.keys(MirrorCache.data),
    nodes: Object.keys(MirrorCache.index.byId || {}).length,
    assets: MirrorCache.assetManifest,
    queue: MirrorCache.queue,
  });
});

app.get("/api/history/:id", async (req, res) => {
  try {
    const history = await loadHistory();
    const nodeId = req.params.id.toUpperCase();
    const items = history
      .filter((event) => String(event.nodeId || "").toUpperCase() === nodeId)
      .slice(-50)
      .reverse();
    res.json({ status: "success", items });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    const history = await loadHistory();
    res.json({ status: "success", items: history.slice(-100).reverse() });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/api/history/export", async (req, res) => {
  try {
    const history = await loadHistory();
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="trazabilidad-history-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json"`,
    );
    res.send(
      JSON.stringify(
        { exportedAt: new Date().toISOString(), items: history },
        null,
        2,
      ),
    );
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/api/backup/export", async (req, res) => {
  try {
    const payload = createBackupPayload();
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="trazabilidad-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json"`,
    );
    res.send(JSON.stringify(payload, null, 2));
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.get("/api/backup/status", async (req, res) => {
  try {
    const history = await loadHistory();
    res.json({
      status: "success",
      backup: {
        nodes: Object.keys(MirrorCache.index.byId || {}).length,
        queue: MirrorCache.queue?.length || 0,
        history: history.length,
        lastSync: MirrorCache.lastSync
          ? new Date(MirrorCache.lastSync).toISOString()
          : null,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.post("/api/backup/restore", async (req, res) => {
  try {
    const payload = req.body;
    await restoreBackupPayload(payload);
    res.json({
      status: "success",
      restored: {
        nodes: Object.keys(MirrorCache.index.byId || {}).length,
        queue: MirrorCache.queue.length,
        source: MirrorCache.source,
      },
    });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
});

app.post("/api/mirror/sync", async (req, res) => {
  try {
    const result = await processSyncQueue();
    await refreshQueueState();
    if (sheets) {
      await MirrorCache.syncAll();
    }
    res.json({
      status: "success",
      ...result,
      queue: MirrorCache.queue,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.post("/api/mirror/queue/:id/retry", async (req, res) => {
  try {
    const queue = await loadQueue();
    const item = queue.find((op) => op.id === req.params.id);
    if (!item) {
      return res
        .status(404)
        .json({ status: "error", message: "Operación no encontrada" });
    }

    item.status = "pending";
    item.lastError = null;
    item.conflict = null;
    await appendHistoryEvent({
      nodeId: item.meta?.qr_id,
      sheetName: item.sheetName,
      action: "queue_retry",
      payload: { queueId: item.id },
    });
    await saveQueue(queue);
    await refreshQueueState();

    const result = await processSyncQueue();
    await refreshQueueState();

    res.json({
      status: "success",
      itemId: item.id,
      ...result,
      queue: MirrorCache.queue,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.post("/api/mirror/queue/:id/discard", async (req, res) => {
  try {
    const queue = await loadQueue();
    const item = queue.find((op) => op.id === req.params.id);
    if (!item) {
      return res
        .status(404)
        .json({ status: "error", message: "Operación no encontrada" });
    }

    item.status = "discarded";
    item.discardedAt = new Date().toISOString();
    await appendHistoryEvent({
      nodeId: item.meta?.qr_id,
      sheetName: item.sheetName,
      action: "queue_discarded",
      payload: { queueId: item.id },
    });
    await saveQueue(queue);
    await refreshQueueState();

    if (sheets) {
      await MirrorCache.syncAll();
    }

    res.json({ status: "success", itemId: item.id, queue: MirrorCache.queue });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.post("/api/mirror/queue/:id/resolve-local", async (req, res) => {
  try {
    const queue = await loadQueue();
    const item = queue.find((op) => op.id === req.params.id);
    if (!item) {
      return res
        .status(404)
        .json({ status: "error", message: "Operación no encontrada" });
    }
    if (item.status !== "conflict") {
      return res
        .status(400)
        .json({
          status: "error",
          message: "La operación no está en conflicto",
        });
    }

    item.status = "pending";
    item.lastError = null;
    item.conflict = null;
    item.resolution = "keep_local";
    await appendHistoryEvent({
      nodeId: item.meta?.qr_id,
      sheetName: item.sheetName,
      action: "conflict_resolve_local",
      payload: { queueId: item.id },
    });
    await saveQueue(queue);
    await refreshQueueState();

    const result = await processSyncQueue();
    await refreshQueueState();

    res.json({
      status: "success",
      itemId: item.id,
      resolution: "keep_local",
      ...result,
      queue: MirrorCache.queue,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

app.post("/api/mirror/queue/:id/resolve-remote", async (req, res) => {
  try {
    const queue = await loadQueue();
    const item = queue.find((op) => op.id === req.params.id);
    if (!item) {
      return res
        .status(404)
        .json({ status: "error", message: "Operación no encontrada" });
    }
    if (item.status !== "conflict") {
      return res
        .status(400)
        .json({
          status: "error",
          message: "La operación no está en conflicto",
        });
    }

    item.status = "discarded";
    item.discardedAt = new Date().toISOString();
    item.resolution = "keep_remote";
    await appendHistoryEvent({
      nodeId: item.meta?.qr_id,
      sheetName: item.sheetName,
      action: "conflict_resolve_remote",
      payload: { queueId: item.id },
    });
    await saveQueue(queue);

    await reloadMirrorFromCurrentSources();

    res.json({
      status: "success",
      itemId: item.id,
      resolution: "keep_remote",
      queue: MirrorCache.queue,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Redirigir cualquier otra ruta no API al frontend (React)
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api/")) {
    res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
  }
});

const PORT = process.env.PORT || 3001;
initGoogle().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
  });
});
