import fs from "fs/promises";
import path from "path";
import Database from "better-sqlite3";
import mqtt from "mqtt";

const ROOM_DEFS = [
  { id: "room_clones", name: "Sala de Clones", roomType: "cultivo" },
  { id: "room_madres", name: "Sala de Madres", roomType: "cultivo" },
  { id: "room_vegetativo", name: "Sala de Vegetativo", roomType: "cultivo" },
  { id: "room_floracion", name: "Sala de Floración", roomType: "cultivo" },
  {
    id: "room_almacen_cosecha",
    name: "Almacén Cosecha",
    roomType: "almacen",
  },
];

const METRIC_SPECS = {
  "ambient.t": { label: "Temperatura", unit: "C", field: "ambient_t" },
  "ambient.h": { label: "Humedad", unit: "%", field: "ambient_h" },
  "ambient.vpd": { label: "VPD", unit: "kPa", field: "ambient_vpd" },
  "ambient.dli": { label: "DLI", unit: "mol/m2/d", field: "ambient_dli" },
  "substrate.t": {
    label: "T sustrato",
    unit: "C",
    field: "substrate_t",
  },
  "fertigation.ec": {
    label: "EC",
    unit: "mS/cm",
    field: "fertigation_ec",
  },
  "fertigation.ph": { label: "pH", unit: "pH", field: "fertigation_ph" },
};

const POLICY_PROFILES = {
  "Sala de Clones": {
    room: "Sala de Clones",
    version: "1.0",
    appliesTo: Object.keys(METRIC_SPECS),
    metrics: {
      "ambient.t": makeMetricPolicy("C", 24, 26, 22, 28, 20, 30),
      "ambient.h": makeMetricPolicy("%", 75, 85, 70, 90, 65, 92),
      "ambient.vpd": makeMetricPolicy("kPa", 0.4, 0.8, 0.3, 0.9, 0.2, 1.1),
      "ambient.dli": makeMetricPolicy(
        "mol/m2/d",
        6,
        12,
        4,
        14,
        3,
        16,
      ),
      "substrate.t": makeMetricPolicy("C", 22, 24, 20, 25, 18, 27),
      "fertigation.ec": makeMetricPolicy("mS/cm", 0.4, 0.8, 0.3, 1.0, 0.2, 1.2),
      "fertigation.ph": makeMetricPolicy("pH", 5.8, 6.2, 5.6, 6.4, 5.4, 6.6),
    },
    freshness: { warningSeconds: 900, alarmSeconds: 3600 },
    persistence: {
      warningConsecutiveReadings: 3,
      alarmConsecutiveReadings: 3,
      recoveryConsecutiveReadings: 3,
    },
    combinationRules: [
      {
        code: "CLONES_STRESS_DRY",
        if: ["ambient.h.low", "ambient.vpd.high"],
        severity: "high",
      },
      {
        code: "CLONES_FUNGAL_RISK",
        if: ["ambient.h.high", "ambient.t.high"],
        severity: "medium",
      },
    ],
  },
  "Sala de Madres": {
    room: "Sala de Madres",
    version: "1.0",
    appliesTo: Object.keys(METRIC_SPECS),
    metrics: {
      "ambient.t": makeMetricPolicy("C", 24, 28, 22, 30, 20, 32),
      "ambient.h": makeMetricPolicy("%", 55, 70, 50, 75, 45, 80),
      "ambient.vpd": makeMetricPolicy("kPa", 0.8, 1.2, 0.6, 1.4, 0.5, 1.6),
      "ambient.dli": makeMetricPolicy(
        "mol/m2/d",
        20,
        30,
        16,
        34,
        12,
        40,
      ),
      "substrate.t": makeMetricPolicy("C", 20, 24, 18, 25, 16, 27),
      "fertigation.ec": makeMetricPolicy("mS/cm", 1.2, 2.0, 1.0, 2.2, 0.8, 2.5),
      "fertigation.ph": makeMetricPolicy("pH", 5.8, 6.3, 5.6, 6.5, 5.4, 6.7),
    },
    freshness: { warningSeconds: 900, alarmSeconds: 3600 },
    persistence: {
      warningConsecutiveReadings: 3,
      alarmConsecutiveReadings: 3,
      recoveryConsecutiveReadings: 3,
    },
    combinationRules: [
      {
        code: "MADRES_HEAT_STRESS",
        if: ["ambient.t.high", "ambient.vpd.high"],
        severity: "medium",
      },
    ],
  },
  "Sala de Vegetativo": {
    room: "Sala de Vegetativo",
    version: "1.0",
    appliesTo: Object.keys(METRIC_SPECS),
    metrics: {
      "ambient.t": makeMetricPolicy("C", 24, 28, 22, 30, 20, 32),
      "ambient.h": makeMetricPolicy("%", 60, 75, 55, 80, 50, 85),
      "ambient.vpd": makeMetricPolicy("kPa", 0.8, 1.2, 0.6, 1.4, 0.5, 1.6),
      "ambient.dli": makeMetricPolicy(
        "mol/m2/d",
        20,
        35,
        16,
        40,
        12,
        45,
      ),
      "substrate.t": makeMetricPolicy("C", 20, 24, 18, 25, 16, 27),
      "fertigation.ec": makeMetricPolicy("mS/cm", 1.2, 1.8, 1.0, 2.0, 0.8, 2.3),
      "fertigation.ph": makeMetricPolicy("pH", 5.8, 6.2, 5.6, 6.4, 5.4, 6.6),
    },
    freshness: { warningSeconds: 900, alarmSeconds: 3600 },
    persistence: {
      warningConsecutiveReadings: 3,
      alarmConsecutiveReadings: 3,
      recoveryConsecutiveReadings: 3,
    },
    combinationRules: [
      {
        code: "VEG_STRESS_DRY",
        if: ["ambient.h.low", "ambient.vpd.high"],
        severity: "medium",
      },
      {
        code: "VEG_GROWTH_LIMIT_LIGHT",
        if: ["ambient.dli.low", "ambient.t.low"],
        severity: "low",
      },
    ],
  },
  "Sala de Floración": {
    room: "Sala de Floración",
    version: "1.0",
    appliesTo: Object.keys(METRIC_SPECS),
    metrics: {
      "ambient.t": makeMetricPolicy("C", 22, 26, 20, 28, 18, 30),
      "ambient.h": makeMetricPolicy("%", 45, 60, 40, 65, 35, 70),
      "ambient.vpd": makeMetricPolicy("kPa", 1.0, 1.4, 0.8, 1.6, 0.6, 1.8),
      "ambient.dli": makeMetricPolicy(
        "mol/m2/d",
        30,
        45,
        25,
        50,
        20,
        55,
      ),
      "substrate.t": makeMetricPolicy("C", 20, 23, 18, 24, 16, 26),
      "fertigation.ec": makeMetricPolicy("mS/cm", 1.4, 2.2, 1.2, 2.4, 1.0, 2.7),
      "fertigation.ph": makeMetricPolicy("pH", 5.8, 6.3, 5.6, 6.5, 5.4, 6.7),
    },
    freshness: { warningSeconds: 900, alarmSeconds: 3600 },
    persistence: {
      warningConsecutiveReadings: 3,
      alarmConsecutiveReadings: 3,
      recoveryConsecutiveReadings: 3,
    },
    combinationRules: [
      {
        code: "FLOR_BOTRYTIS_RISK",
        if: ["ambient.h.high", "ambient.t.high"],
        severity: "high",
      },
      {
        code: "FLOR_STRESS_DRY",
        if: ["ambient.h.low", "ambient.vpd.high"],
        severity: "medium",
      },
    ],
  },
  "Almacén Cosecha": {
    room: "Almacén Cosecha",
    version: "1.0",
    appliesTo: ["ambient.t", "ambient.h"],
    metrics: {
      "ambient.t": makeMetricPolicy("C", 15, 21, 13, 23, 10, 25),
      "ambient.h": makeMetricPolicy("%", 45, 55, 40, 60, 35, 65),
    },
    freshness: { warningSeconds: 600, alarmSeconds: 1800 },
    persistence: {
      warningConsecutiveReadings: 3,
      alarmConsecutiveReadings: 3,
      recoveryConsecutiveReadings: 3,
    },
    combinationRules: [
      {
        code: "ALMACEN_MOISTURE_RISK",
        if: ["ambient.h.high"],
        severity: "high",
      },
      {
        code: "ALMACEN_HEAT_RISK",
        if: ["ambient.t.high"],
        severity: "high",
      },
    ],
  },
};

let db = null;
let mqttClient = null;
let mqttState = {
  connected: false,
  brokerUrl: null,
  topics: [],
  lastMessageAt: null,
  lastError: null,
};

const MQTT_TOPIC_MAP = {
  "trazabilidad/iot/sala/clones": "Sala de Clones",
  "trazabilidad/iot/sala/madres": "Sala de Madres",
  "trazabilidad/iot/sala/vegetativo": "Sala de Vegetativo",
  "trazabilidad/iot/sala/floracion": "Sala de Floración",
  "trazabilidad/iot/sala/almacen-cosecha": "Almacén Cosecha",
};

function makeMetricPolicy(unit, targetMin, targetMax, warningMin, warningMax, alarmMin, alarmMax) {
  return {
    unit,
    target: { min: targetMin, max: targetMax },
    warning: { min: warningMin, max: warningMax },
    alarm: { min: alarmMin, max: alarmMax },
  };
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function createTraceId(prefix = "iot") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveRoomName(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;

  const aliases = {
    clones: "Sala de Clones",
    "sala de clones": "Sala de Clones",
    madres: "Sala de Madres",
    "sala de madres": "Sala de Madres",
    vegetativo: "Sala de Vegetativo",
    "sala de vegetativo": "Sala de Vegetativo",
    "sala vegetativo": "Sala de Vegetativo",
    floracion: "Sala de Floración",
    "sala de floracion": "Sala de Floración",
    "sala floracion": "Sala de Floración",
    "almacen cosecha": "Almacén Cosecha",
    almacen: "Almacén Cosecha",
    "almacen de cosecha": "Almacén Cosecha",
  };

  if (aliases[normalized]) return aliases[normalized];
  const exact = ROOM_DEFS.find((room) => normalizeText(room.name) === normalized);
  return exact ? exact.name : null;
}

function extractRoomFromLocation(location) {
  const normalized = normalizeText(location);
  if (!normalized) return null;
  if (normalized.includes("clon")) return "Sala de Clones";
  if (normalized.includes("madre")) return "Sala de Madres";
  if (normalized.includes("veget")) return "Sala de Vegetativo";
  if (normalized.includes("flor")) return "Sala de Floración";
  if (normalized.includes("almacen") || normalized.includes("cosecha")) {
    return "Almacén Cosecha";
  }
  return resolveRoomName(location);
}

function getPolicyByRoomName(roomName) {
  return POLICY_PROFILES[roomName] || null;
}

function getMetricValue(metrics, key) {
  const aliases = {
    "ambient.t": [metrics?.ambient?.t, metrics?.t, metrics?.temperature],
    "ambient.h": [metrics?.ambient?.h, metrics?.h, metrics?.humidity],
    "ambient.vpd": [metrics?.ambient?.vpd, metrics?.vpd],
    "ambient.dli": [metrics?.ambient?.dli, metrics?.dli],
    "substrate.t": [metrics?.substrate?.t, metrics?.substrate_t],
    "fertigation.ec": [metrics?.fertigation?.ec, metrics?.ec],
    "fertigation.ph": [metrics?.fertigation?.ph, metrics?.ph],
  };
  const match = (aliases[key] || []).find((value) => value !== undefined && value !== null && value !== "");
  if (match === undefined) return null;
  const numeric = Number(match);
  return Number.isFinite(numeric) ? numeric : null;
}

function metricState(policy, value) {
  if (value === null || value === undefined) return null;
  if (value < policy.alarm.min) return "alarm_low";
  if (value > policy.alarm.max) return "alarm_high";
  if (value < policy.target.min) return "warning_low";
  if (value > policy.target.max) return "warning_high";
  return "ok";
}

function getRoomIdByName(roomName) {
  const room = ROOM_DEFS.find((item) => item.name === roomName);
  return room ? room.id : null;
}

function withDb() {
  if (!db) throw new Error("Base IoT no inicializada");
  return db;
}

function mapReadingRow(row) {
  return {
    ts: row.observed_at,
    ambient: {
      t: row.ambient_t,
      h: row.ambient_h,
      vpd: row.ambient_vpd,
      dli: row.ambient_dli,
    },
    substrate: { t: row.substrate_t },
    fertigation: { ec: row.fertigation_ec, ph: row.fertigation_ph },
    qualityStatus: row.quality_status,
  };
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function buildSummary(roomName, status, anomalies, dataQuality) {
  if (status === "OFFLINE") {
    return `${roomName} sin telemetría reciente o sin conectividad operativa.`;
  }
  if (status === "STALE") {
    return `${roomName} con datos desactualizados; revisar gateway, broker o sensores.`;
  }
  if (!anomalies.length) {
    return `${roomName} en estado ${status} con telemetría reciente y dentro de parámetros operativos.`;
  }
  const labels = anomalies
    .slice(0, 3)
    .map((anomaly) => anomaly.label.toLowerCase())
    .join(", ");
  const freshnessNote = dataQuality.stale
    ? " Los datos presentan degradación de frescura."
    : "";
  return `${roomName} en estado ${status} por desviaciones en ${labels}.${freshnessNote}`;
}

function buildRecommendedActions(roomName, status, anomalies, dataQuality) {
  const actions = [];
  if (dataQuality.stale) {
    actions.push("Verificar gateway, broker MQTT y salud de sensores de la sala.");
  }
  if (status === "ALARM") {
    actions.push("Confirmar físicamente la condición de sala y ejecutar acción correctiva autorizada.");
  }
  if (roomName === "Sala de Floración" && anomalies.some((item) => item.metric === "ambient.h" && item.direction === "high")) {
    actions.push("Revisar ventilación, extracción y riesgo de botritis en floración.");
  }
  if (roomName === "Almacén Cosecha" && anomalies.some((item) => item.metric === "ambient.h" && item.direction === "high")) {
    actions.push("Inspeccionar condiciones de conservación del material en almacén de cosecha.");
  }
  if (!actions.length && status === "WARNING") {
    actions.push("Revisar la sala y confirmar si la desviación es operativa o instrumental.");
  }
  return actions;
}

function evaluateReading(roomName, reading, previousRows = []) {
  const policy = getPolicyByRoomName(roomName);
  if (!policy) throw new Error(`No existe política para ${roomName}`);

  const anomalies = [];
  let status = "OK";
  let severity = "low";
  const matchedSignals = [];

  for (const metricName of policy.appliesTo) {
    const metricPolicy = policy.metrics[metricName];
    const value = reading[METRIC_SPECS[metricName].field] ?? null;
    const state = metricState(metricPolicy, value);
    if (!state || state === "ok") continue;

    const direction = state.endsWith("high") ? "high" : "low";
    const level = state.startsWith("alarm") ? "alarm" : "warning";
    matchedSignals.push(`${metricName}.${direction}`);
    anomalies.push({
      metric: metricName,
      label: METRIC_SPECS[metricName].label,
      direction,
      level,
      current: value,
      target: metricPolicy.target,
      warning: metricPolicy.warning,
      alarm: metricPolicy.alarm,
      unit: metricPolicy.unit,
    });
    if (level === "alarm") {
      status = "ALARM";
      severity = "high";
    } else if (status !== "ALARM") {
      status = "WARNING";
      severity = anomalies.length > 1 ? "medium" : "low";
    }
  }

  for (const rule of policy.combinationRules || []) {
    if (rule.if.every((signal) => matchedSignals.includes(signal))) {
      anomalies.push({
        metric: "combination",
        label: rule.code,
        direction: "mixed",
        level: rule.severity === "high" ? "alarm" : "warning",
        current: null,
        unit: null,
      });
      if (rule.severity === "high") {
        status = "ALARM";
        severity = "high";
      } else if (status !== "ALARM") {
        status = "WARNING";
        severity = "medium";
      }
    }
  }

  const lastObservedAt = reading.observed_at || reading.received_at;
  const freshnessSeconds = Math.max(
    0,
    Math.round((Date.now() - new Date(lastObservedAt).getTime()) / 1000),
  );
  const stale = freshnessSeconds > policy.freshness.warningSeconds;
  if (freshnessSeconds > policy.freshness.alarmSeconds) {
    status = "OFFLINE";
    severity = "high";
  } else if (stale && status === "OK") {
    status = "STALE";
    severity = "medium";
  }

  const recentRows = [reading, ...previousRows].slice(
    0,
    Math.max(policy.persistence.warningConsecutiveReadings, policy.persistence.alarmConsecutiveReadings),
  );
  const dataQuality = {
    freshnessSeconds,
    stale,
    sensorHealth: status === "OFFLINE" ? "offline" : "ok",
    missingMetrics: policy.appliesTo.filter(
      (metricName) => reading[METRIC_SPECS[metricName].field] === null || reading[METRIC_SPECS[metricName].field] === undefined,
    ),
    recentReadings: recentRows.length,
  };

  return {
    status,
    severity,
    anomalies,
    dataQuality,
    summary: buildSummary(roomName, status, anomalies, dataQuality),
    recommendedActions: buildRecommendedActions(roomName, status, anomalies, dataQuality),
  };
}

function resolveAlertCode(roomName, anomalies, status) {
  const prefix = normalizeText(roomName)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  const primary = anomalies.find((item) => item.metric !== "combination") || anomalies[0];
  if (!primary) return `${prefix}_${status}`;
  return `${prefix}_${primary.metric.replace(/[^a-z0-9]+/gi, "_").toUpperCase()}_${primary.direction.toUpperCase()}`;
}

async function ensureSchema() {
  const schema = `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS iot_rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      room_type TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS iot_devices (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      device_name TEXT,
      device_type TEXT NOT NULL,
      source_protocol TEXT NOT NULL,
      topic TEXT,
      status TEXT NOT NULL CHECK (status IN ('ok', 'degraded', 'offline', 'disabled')),
      last_seen_at TEXT,
      firmware_version TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES iot_rooms(id)
    );

    CREATE TABLE IF NOT EXISTS iot_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id TEXT NOT NULL,
      device_id TEXT NOT NULL,
      observed_at TEXT NOT NULL,
      received_at TEXT NOT NULL,
      ambient_t REAL,
      ambient_h REAL,
      ambient_vpd REAL,
      ambient_dli REAL,
      substrate_t REAL,
      fertigation_ec REAL,
      fertigation_ph REAL,
      payload_json TEXT,
      quality_status TEXT NOT NULL CHECK (quality_status IN ('ok', 'partial', 'invalid', 'stale_import')),
      validation_errors_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES iot_rooms(id),
      FOREIGN KEY (device_id) REFERENCES iot_devices(id)
    );

    CREATE TABLE IF NOT EXISTS iot_room_snapshots (
      room_id TEXT PRIMARY KEY,
      last_observed_at TEXT,
      last_received_at TEXT,
      status TEXT NOT NULL CHECK (status IN ('OK', 'WARNING', 'ALARM', 'STALE', 'OFFLINE')),
      severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
      summary TEXT,
      ambient_t_current REAL,
      ambient_h_current REAL,
      ambient_vpd_current REAL,
      ambient_dli_current REAL,
      substrate_t_current REAL,
      fertigation_ec_current REAL,
      fertigation_ph_current REAL,
      freshness_seconds INTEGER,
      sensor_health TEXT NOT NULL CHECK (sensor_health IN ('ok', 'degraded', 'offline', 'unknown')),
      missing_metrics_json TEXT,
      anomalies_json TEXT,
      recommended_actions_json TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES iot_rooms(id)
    );

    CREATE TABLE IF NOT EXISTS iot_alerts (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      device_id TEXT,
      agent TEXT NOT NULL CHECK (agent IN ('S2_IOT', 'S2_E')),
      alarm_code TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'acknowledged', 'resolved', 'discarded')),
      severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
      reason TEXT NOT NULL,
      evidence_json TEXT,
      immediate_actions_json TEXT,
      operator_ack_required INTEGER NOT NULL DEFAULT 1,
      acked INTEGER NOT NULL DEFAULT 0,
      acked_by_user_id TEXT,
      acked_at TEXT,
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      resolution_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES iot_rooms(id),
      FOREIGN KEY (device_id) REFERENCES iot_devices(id)
    );

    CREATE TABLE IF NOT EXISTS iot_policy_profiles (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      version TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      policy_json TEXT NOT NULL,
      approved_by TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES iot_rooms(id)
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id TEXT PRIMARY KEY,
      agent TEXT NOT NULL CHECK (agent IN ('S1_CHAT', 'S2_IOT', 'S2_E')),
      trigger_type TEXT NOT NULL,
      room_id TEXT,
      qr_id TEXT,
      input_json TEXT,
      output_json TEXT,
      status TEXT NOT NULL CHECK (status IN ('success', 'error')),
      duration_ms INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES iot_rooms(id)
    );

    CREATE INDEX IF NOT EXISTS idx_iot_devices_room_status ON iot_devices(room_id, status);
    CREATE INDEX IF NOT EXISTS idx_iot_readings_room_observed ON iot_readings(room_id, observed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_iot_readings_device_observed ON iot_readings(device_id, observed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_iot_alerts_room_status_opened ON iot_alerts(room_id, status, opened_at DESC);
    CREATE INDEX IF NOT EXISTS idx_iot_policy_profiles_room_active ON iot_policy_profiles(room_id, is_active);
  `;
  withDb().exec(schema);
}

function seedRoomsAndPolicies() {
  const database = withDb();
  const insertRoom = database.prepare(`
    INSERT INTO iot_rooms (id, name, room_type, active, created_at)
    VALUES (@id, @name, @roomType, 1, @createdAt)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      room_type = excluded.room_type,
      active = excluded.active
  `);
  const insertPolicy = database.prepare(`
    INSERT INTO iot_policy_profiles (id, room_id, version, is_active, policy_json, approved_by, approved_at, created_at, updated_at)
    VALUES (@id, @roomId, @version, 1, @policyJson, 'system', @approvedAt, @createdAt, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      version = excluded.version,
      policy_json = excluded.policy_json,
      approved_at = excluded.approved_at,
      updated_at = excluded.updated_at,
      is_active = 1
  `);

  const createdAt = nowIso();
  for (const room of ROOM_DEFS) {
    insertRoom.run({ ...room, createdAt });
    insertPolicy.run({
      id: `policy-${room.id}-v1`,
      roomId: room.id,
      version: "1.0",
      policyJson: JSON.stringify(getPolicyByRoomName(room.name), null, 2),
      approvedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });
  }
}

export async function initIotSystem(rootDir) {
  const localIotDir = path.join(rootDir, "local_iot");
  await fs.mkdir(localIotDir, { recursive: true });
  const dbPath = path.join(localIotDir, "iot.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  await ensureSchema();
  seedRoomsAndPolicies();
  return { dbPath };
}

export function connectMqttBroker(options = {}) {
  const brokerUrl = options.brokerUrl || process.env.MQTT_URL || "mqtt://127.0.0.1:1883";
  const topics = options.topics || Object.keys(MQTT_TOPIC_MAP);
  if (mqttClient) {
    return { brokerUrl: mqttState.brokerUrl, topics: mqttState.topics };
  }

  mqttState = {
    ...mqttState,
    brokerUrl,
    topics,
    lastError: null,
  };

  mqttClient = mqtt.connect(brokerUrl, {
    connectTimeout: 5000,
    reconnectPeriod: 5000,
  });

  mqttClient.on("connect", () => {
    mqttState.connected = true;
    mqttState.lastError = null;
    mqttClient.subscribe(topics, (error) => {
      if (error) {
        mqttState.lastError = error.message;
      }
    });
  });

  mqttClient.on("reconnect", () => {
    mqttState.connected = false;
  });

  mqttClient.on("close", () => {
    mqttState.connected = false;
  });

  mqttClient.on("error", (error) => {
    mqttState.lastError = error.message;
    mqttState.connected = false;
  });

  mqttClient.on("message", (topic, message) => {
    mqttState.lastMessageAt = nowIso();
    const room = MQTT_TOPIC_MAP[topic];
    if (!room) return;
    try {
      const payload = JSON.parse(String(message || "{}"));
      ingestIotReading({
        ...payload,
        room,
        topic,
        source: "mqtt",
      });
    } catch (error) {
      mqttState.lastError = `Payload MQTT inválido en ${topic}: ${error.message}`;
    }
  });

  return { brokerUrl, topics };
}

function upsertDevice(roomId, deviceId, topic = null, metadata = null) {
  const database = withDb();
  const statement = database.prepare(`
    INSERT INTO iot_devices (
      id, room_id, device_name, device_type, source_protocol, topic, status,
      last_seen_at, firmware_version, metadata_json, created_at, updated_at
    ) VALUES (
      @id, @roomId, @deviceName, 'sensor_gateway', 'http', @topic, 'ok',
      @lastSeenAt, NULL, @metadataJson, @createdAt, @updatedAt
    )
    ON CONFLICT(id) DO UPDATE SET
      room_id = excluded.room_id,
      topic = excluded.topic,
      last_seen_at = excluded.last_seen_at,
      metadata_json = excluded.metadata_json,
      status = 'ok',
      updated_at = excluded.updated_at
  `);
  const now = nowIso();
  statement.run({
    id: deviceId,
    roomId,
    deviceName: deviceId,
    topic,
    lastSeenAt: now,
    metadataJson: metadata ? JSON.stringify(metadata) : null,
    createdAt: now,
    updatedAt: now,
  });
}

function upsertSnapshot(roomId, reading, evaluation) {
  const database = withDb();
  const statement = database.prepare(`
    INSERT INTO iot_room_snapshots (
      room_id, last_observed_at, last_received_at, status, severity, summary,
      ambient_t_current, ambient_h_current, ambient_vpd_current, ambient_dli_current,
      substrate_t_current, fertigation_ec_current, fertigation_ph_current,
      freshness_seconds, sensor_health, missing_metrics_json, anomalies_json,
      recommended_actions_json, updated_at
    ) VALUES (
      @roomId, @lastObservedAt, @lastReceivedAt, @status, @severity, @summary,
      @ambientTCurrent, @ambientHCurrent, @ambientVpdCurrent, @ambientDliCurrent,
      @substrateTCurrent, @fertigationEcCurrent, @fertigationPhCurrent,
      @freshnessSeconds, @sensorHealth, @missingMetricsJson, @anomaliesJson,
      @recommendedActionsJson, @updatedAt
    ) ON CONFLICT(room_id) DO UPDATE SET
      last_observed_at = excluded.last_observed_at,
      last_received_at = excluded.last_received_at,
      status = excluded.status,
      severity = excluded.severity,
      summary = excluded.summary,
      ambient_t_current = excluded.ambient_t_current,
      ambient_h_current = excluded.ambient_h_current,
      ambient_vpd_current = excluded.ambient_vpd_current,
      ambient_dli_current = excluded.ambient_dli_current,
      substrate_t_current = excluded.substrate_t_current,
      fertigation_ec_current = excluded.fertigation_ec_current,
      fertigation_ph_current = excluded.fertigation_ph_current,
      freshness_seconds = excluded.freshness_seconds,
      sensor_health = excluded.sensor_health,
      missing_metrics_json = excluded.missing_metrics_json,
      anomalies_json = excluded.anomalies_json,
      recommended_actions_json = excluded.recommended_actions_json,
      updated_at = excluded.updated_at
  `);
  statement.run({
    roomId,
    lastObservedAt: reading.observed_at,
    lastReceivedAt: reading.received_at,
    status: evaluation.status,
    severity: evaluation.severity,
    summary: evaluation.summary,
    ambientTCurrent: reading.ambient_t ?? null,
    ambientHCurrent: reading.ambient_h ?? null,
    ambientVpdCurrent: reading.ambient_vpd ?? null,
    ambientDliCurrent: reading.ambient_dli ?? null,
    substrateTCurrent: reading.substrate_t ?? null,
    fertigationEcCurrent: reading.fertigation_ec ?? null,
    fertigationPhCurrent: reading.fertigation_ph ?? null,
    freshnessSeconds: evaluation.dataQuality.freshnessSeconds,
    sensorHealth: evaluation.dataQuality.sensorHealth,
    missingMetricsJson: JSON.stringify(evaluation.dataQuality.missingMetrics),
    anomaliesJson: JSON.stringify(evaluation.anomalies),
    recommendedActionsJson: JSON.stringify(evaluation.recommendedActions),
    updatedAt: nowIso(),
  });
}

function syncAlerts(roomId, deviceId, roomName, evaluation) {
  const database = withDb();
  const activeAlerts = database
    .prepare(
      `SELECT id, alarm_code FROM iot_alerts WHERE room_id = ? AND status IN ('active', 'acknowledged')`,
    )
    .all(roomId);

  if (!["WARNING", "ALARM"].includes(evaluation.status)) {
    database
      .prepare(
        `UPDATE iot_alerts SET status = 'resolved', closed_at = ?, updated_at = ?, resolution_note = 'Condición normalizada automáticamente' WHERE room_id = ? AND status IN ('active', 'acknowledged')`,
      )
      .run(nowIso(), nowIso(), roomId);
    return [];
  }

  const code = resolveAlertCode(roomName, evaluation.anomalies, evaluation.status);
  const openedAt = nowIso();
  const existing = activeAlerts.find((item) => item.alarm_code === code);
  if (existing) {
    database
      .prepare(
        `UPDATE iot_alerts SET severity = ?, reason = ?, evidence_json = ?, immediate_actions_json = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        evaluation.severity,
        evaluation.summary,
        JSON.stringify({ anomalies: evaluation.anomalies, dataQuality: evaluation.dataQuality }),
        JSON.stringify(evaluation.recommendedActions),
        nowIso(),
        existing.id,
      );
  } else {
    database
      .prepare(
        `INSERT INTO iot_alerts (
          id, room_id, device_id, agent, alarm_code, status, severity, reason,
          evidence_json, immediate_actions_json, operator_ack_required, acked,
          opened_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'S2_E', ?, 'active', ?, ?, ?, ?, 1, 0, ?, ?, ?)`,
      )
      .run(
        createTraceId("alert"),
        roomId,
        deviceId,
        code,
        evaluation.severity,
        evaluation.summary,
        JSON.stringify({ anomalies: evaluation.anomalies, dataQuality: evaluation.dataQuality }),
        JSON.stringify(evaluation.recommendedActions),
        openedAt,
        openedAt,
        openedAt,
      );
  }

  for (const alert of activeAlerts) {
    if (alert.alarm_code !== code) {
      database
        .prepare(
          `UPDATE iot_alerts SET status = 'resolved', closed_at = ?, updated_at = ?, resolution_note = 'Reemplazada por condición más reciente' WHERE id = ?`,
        )
        .run(nowIso(), nowIso(), alert.id);
    }
  }

  return listEmergencyAlerts({ roomId, activeOnly: true });
}

function recordAgentRun(agent, triggerType, roomId, inputPayload, outputPayload, status = "success") {
  withDb()
    .prepare(
      `INSERT INTO agent_runs (id, agent, trigger_type, room_id, qr_id, input_json, output_json, status, duration_ms, created_at)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?, NULL, ?)`,
    )
    .run(
      createTraceId("run"),
      agent,
      triggerType,
      roomId,
      JSON.stringify(inputPayload),
      JSON.stringify(outputPayload),
      status,
      nowIso(),
    );
}

export function ingestIotReading(payload) {
  const database = withDb();
  const roomName = resolveRoomName(payload.room) || resolveRoomName(payload.sala);
  if (!roomName) throw new Error("Sala no válida");

  const roomId = getRoomIdByName(roomName);
  const policy = getPolicyByRoomName(roomName);
  const deviceId = String(payload.deviceId || payload.device_id || `manual-${roomId}`);
  const observedAt = payload.timestamp || payload.observedAt || nowIso();
  const receivedAt = nowIso();
  const metrics = payload.metrics || payload;

  const reading = {
    room_id: roomId,
    device_id: deviceId,
    observed_at: new Date(observedAt).toISOString(),
    received_at: receivedAt,
    ambient_t: getMetricValue(metrics, "ambient.t"),
    ambient_h: getMetricValue(metrics, "ambient.h"),
    ambient_vpd: getMetricValue(metrics, "ambient.vpd"),
    ambient_dli: getMetricValue(metrics, "ambient.dli"),
    substrate_t: getMetricValue(metrics, "substrate.t"),
    fertigation_ec: getMetricValue(metrics, "fertigation.ec"),
    fertigation_ph: getMetricValue(metrics, "fertigation.ph"),
  };

  for (const metricName of Object.keys(METRIC_SPECS)) {
    if (!policy.appliesTo.includes(metricName)) {
      reading[METRIC_SPECS[metricName].field] = null;
    }
  }

  const validationErrors = [];
  if (!policy.appliesTo.some((metricName) => reading[METRIC_SPECS[metricName].field] !== null)) {
    validationErrors.push("No se recibió ninguna métrica aplicable para la sala");
  }

  upsertDevice(roomId, deviceId, payload.topic || null, payload.metadata || null);

  database
    .prepare(
      `INSERT INTO iot_readings (
        room_id, device_id, observed_at, received_at, ambient_t, ambient_h,
        ambient_vpd, ambient_dli, substrate_t, fertigation_ec, fertigation_ph,
        payload_json, quality_status, validation_errors_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      roomId,
      deviceId,
      reading.observed_at,
      reading.received_at,
      reading.ambient_t,
      reading.ambient_h,
      reading.ambient_vpd,
      reading.ambient_dli,
      reading.substrate_t,
      reading.fertigation_ec,
      reading.fertigation_ph,
      JSON.stringify(payload),
      validationErrors.length ? "partial" : "ok",
      validationErrors.length ? JSON.stringify(validationErrors) : null,
      nowIso(),
    );

  const previousRows = database
    .prepare(
      `SELECT observed_at, ambient_t, ambient_h, ambient_vpd, ambient_dli, substrate_t, fertigation_ec, fertigation_ph, quality_status
       FROM iot_readings WHERE room_id = ? ORDER BY observed_at DESC LIMIT 2`,
    )
    .all(roomId)
    .map(mapReadingRow)
    .map((row) => ({
      observed_at: row.ts,
      ambient_t: row.ambient.t,
      ambient_h: row.ambient.h,
      ambient_vpd: row.ambient.vpd,
      ambient_dli: row.ambient.dli,
      substrate_t: row.substrate.t,
      fertigation_ec: row.fertigation.ec,
      fertigation_ph: row.fertigation.ph,
    }));

  const evaluation = evaluateReading(roomName, reading, previousRows);
  upsertSnapshot(roomId, reading, evaluation);
  const activeAlerts = syncAlerts(roomId, deviceId, roomName, evaluation);
  recordAgentRun("S2_IOT", "ingest", roomId, payload, { evaluation, activeAlerts });

  return {
    room: roomName,
    roomId,
    classification: {
      status: evaluation.status,
      reason: evaluation.summary,
      severity: evaluation.severity,
    },
    summary: evaluation.summary,
    anomalies: evaluation.anomalies,
    recommendedActions: evaluation.recommendedActions,
    dataQuality: evaluation.dataQuality,
    activeAlerts,
  };
}

export function getRoomSnapshot(roomName) {
  const roomId = getRoomIdByName(resolveRoomName(roomName));
  if (!roomId) return null;
  const row = withDb().prepare(`SELECT * FROM iot_room_snapshots WHERE room_id = ?`).get(roomId);
  if (!row) return null;
  return {
    room: resolveRoomName(roomName),
    roomId,
    status: row.status,
    severity: row.severity,
    summary: row.summary,
    lastUpdatedAt: row.updated_at,
    metrics: {
      ambient: {
        t: row.ambient_t_current,
        h: row.ambient_h_current,
        vpd: row.ambient_vpd_current,
        dli: row.ambient_dli_current,
      },
      substrate: { t: row.substrate_t_current },
      fertigation: {
        ec: row.fertigation_ec_current,
        ph: row.fertigation_ph_current,
      },
    },
    dataQuality: {
      freshnessSeconds: row.freshness_seconds,
      sensorHealth: row.sensor_health,
      missingMetrics: parseJson(row.missing_metrics_json, []),
      stale: row.status === "STALE" || row.status === "OFFLINE",
    },
    anomalies: parseJson(row.anomalies_json, []),
    recommendedActions: parseJson(row.recommended_actions_json, []),
  };
}

export function getRoomStatus(roomName, window = "24h") {
  const snapshot = getRoomSnapshot(roomName);
  if (!snapshot) return null;
  return {
    room: snapshot.room,
    window,
    classification: {
      status: snapshot.status,
      reason: snapshot.summary,
      severity: snapshot.severity,
    },
    metrics: snapshot.metrics,
    dataQuality: snapshot.dataQuality,
    anomalies: snapshot.anomalies,
    recommendedActions: snapshot.recommendedActions,
    lastUpdatedAt: snapshot.lastUpdatedAt,
  };
}

export function getRoomSummary(roomName, window = "24h") {
  const status = getRoomStatus(roomName, window);
  if (!status) return null;
  return {
    room: status.room,
    window,
    summary: status.classification.reason,
    classification: status.classification.status,
    highlights: status.anomalies.slice(0, 3).map((item) => {
      if (item.metric === "combination") return item.label;
      return `${item.label}: ${item.direction === "high" ? "alto" : "bajo"}`;
    }),
    lastUpdatedAt: status.lastUpdatedAt,
  };
}

export function getRoomHistory(roomName, options = {}) {
  const resolvedRoom = resolveRoomName(roomName);
  const roomId = getRoomIdByName(resolvedRoom);
  if (!roomId) return null;

  const from = options.from ? new Date(options.from).toISOString() : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const to = options.to ? new Date(options.to).toISOString() : nowIso();
  const rows = withDb()
    .prepare(
      `SELECT observed_at, ambient_t, ambient_h, ambient_vpd, ambient_dli, substrate_t, fertigation_ec, fertigation_ph
       FROM iot_readings WHERE room_id = ? AND observed_at BETWEEN ? AND ? ORDER BY observed_at ASC`,
    )
    .all(roomId, from, to);

  const series = {
    "ambient.t": [],
    "ambient.h": [],
    "ambient.vpd": [],
    "ambient.dli": [],
    "substrate.t": [],
    "fertigation.ec": [],
    "fertigation.ph": [],
  };

  for (const row of rows) {
    for (const [metricName, spec] of Object.entries(METRIC_SPECS)) {
      if (row[spec.field] === null || row[spec.field] === undefined) continue;
      series[metricName].push({ ts: row.observed_at, value: row[spec.field] });
    }
  }

  if (resolvedRoom === "Almacén Cosecha") {
    delete series["ambient.vpd"];
    delete series["ambient.dli"];
    delete series["substrate.t"];
    delete series["fertigation.ec"];
    delete series["fertigation.ph"];
  }

  return { room: resolvedRoom, from, to, resolution: options.resolution || "raw", series };
}

export function listEmergencyAlerts({ roomId = null, activeOnly = false, roomName = null, window = null } = {}) {
  const clauses = [];
  const params = [];
  if (roomId) {
    clauses.push("room_id = ?");
    params.push(roomId);
  }
  if (roomName) {
    const mappedRoomId = getRoomIdByName(resolveRoomName(roomName));
    if (mappedRoomId) {
      clauses.push("room_id = ?");
      params.push(mappedRoomId);
    }
  }
  if (activeOnly) {
    clauses.push("status IN ('active', 'acknowledged')");
  }
  if (window) {
    clauses.push("opened_at >= ?");
    params.push(new Date(Date.now() - parseWindowMs(window)).toISOString());
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = withDb()
    .prepare(`SELECT * FROM iot_alerts ${where} ORDER BY opened_at DESC`)
    .all(...params);
  return rows.map((row) => ({
    id: row.id,
    alarmCode: row.alarm_code,
    room: ROOM_DEFS.find((item) => item.id === row.room_id)?.name || row.room_id,
    status: row.status,
    severity: row.severity,
    reason: row.reason,
    startedAt: row.opened_at,
    endedAt: row.closed_at,
    operatorAckRequired: Boolean(row.operator_ack_required),
    acked: Boolean(row.acked),
    immediateActions: parseJson(row.immediate_actions_json, []),
  }));
}

export function evaluateEmergency(payload) {
  const roomName = resolveRoomName(payload.room);
  if (!roomName) throw new Error("Sala no válida");
  const snapshot = getRoomSnapshot(roomName);
  const roomId = getRoomIdByName(roomName);
  const activeAlerts = listEmergencyAlerts({ roomName, activeOnly: true });
  let status = snapshot?.status || "OK";
  let severity = snapshot?.severity || "low";
  let reason = snapshot?.summary || "Sin incidencias activas";
  let alarmCode = activeAlerts[0]?.alarmCode || `${normalizeText(roomName).replace(/[^a-z0-9]+/g, "_").toUpperCase()}_${status}`;
  let immediateActions = snapshot?.recommendedActions || [];

  if (payload.eventType === "gateway_offline" || payload.eventType === "broker_offline") {
    status = "ALARM";
    severity = "high";
    alarmCode = `${normalizeText(roomName).replace(/[^a-z0-9]+/g, "_").toUpperCase()}_${payload.eventType.toUpperCase()}`;
    reason = `Incidencia crítica de infraestructura: ${payload.eventType}.`;
    immediateActions = [
      "Verificar conectividad del broker y del gateway de la sala.",
      "Escalar al Técnico de Sistema de forma inmediata.",
    ];
  }

  const result = {
    room: roomName,
    alarm: {
      code: alarmCode,
      status,
      severity,
      reason,
      policySource: `policy-${getRoomIdByName(roomName)}-v1`,
    },
    immediateActions,
    escalation: {
      operatorAckRequired: status !== "OK",
      escalateTo:
        status === "ALARM"
          ? roomName === "Almacén Cosecha"
            ? ["almacen", "qa", "cultivo"]
            : ["cultivo", "qa"]
          : status === "WARNING"
            ? ["operario", "cultivo"]
            : [],
      notifyInApp: status !== "OK",
    },
    evidence: {
      observedAt: payload.observedAt || snapshot?.lastUpdatedAt || nowIso(),
      metrics: snapshot?.metrics || null,
    },
  };
  recordAgentRun("S2_E", payload.eventType || "manual", roomId, payload, result);
  return result;
}

export function getIotContextForNode(node) {
  const roomName = extractRoomFromLocation(node?.data?.Ubicación || node?.data?.Ubicacion || "");
  if (!roomName) return null;
  const status = getRoomStatus(roomName);
  if (!status) return { room: roomName, status: "NO_DATA", latest: null, summary: null, activeAlerts: [] };
  return {
    room: roomName,
    status: status.classification.status,
    latest: {
      ambient: status.metrics.ambient,
      substrate: status.metrics.substrate,
      fertigation: status.metrics.fertigation,
      timestamp: status.lastUpdatedAt,
    },
    summary: status.classification.reason,
    activeAlerts: listEmergencyAlerts({ roomName, activeOnly: true }),
  };
}

export function getIotHealth() {
  const database = withDb();
  const lastTelemetryAt = database
    .prepare(`SELECT MAX(observed_at) AS lastObservedAt FROM iot_readings`)
    .get()?.lastObservedAt;
  const activeAlerts = database
    .prepare(`SELECT COUNT(*) AS total FROM iot_alerts WHERE status IN ('active', 'acknowledged')`)
    .get()?.total;
  const staleRooms = database
    .prepare(`SELECT COUNT(*) AS total FROM iot_room_snapshots WHERE status IN ('STALE', 'OFFLINE')`)
    .get()?.total;
  const roomsOnline = database
    .prepare(`SELECT COUNT(*) AS total FROM iot_room_snapshots WHERE status IN ('OK', 'WARNING', 'ALARM')`)
    .get()?.total;
  return {
    sqliteConnected: true,
    mqttConnected: mqttState.connected,
    mqttBrokerUrl: mqttState.brokerUrl,
    mqttTopics: mqttState.topics,
    mqttLastMessageAt: mqttState.lastMessageAt,
    mqttLastError: mqttState.lastError,
    lastTelemetryAt: lastTelemetryAt || null,
    activeAlerts: activeAlerts || 0,
    staleRooms: staleRooms || 0,
    roomsOnline: roomsOnline || 0,
  };
}

export function exportIotPayload() {
  const database = withDb();
  const tables = [
    "iot_rooms",
    "iot_devices",
    "iot_readings",
    "iot_room_snapshots",
    "iot_alerts",
    "iot_policy_profiles",
    "agent_runs",
  ];
  const payload = { exportedAt: nowIso(), tables: {} };
  for (const table of tables) {
    payload.tables[table] = database.prepare(`SELECT * FROM ${table}`).all();
  }
  return payload;
}

export function restoreIotPayload(payload) {
  if (!payload?.tables || typeof payload.tables !== "object") {
    throw new Error("Payload IoT inválido");
  }
  const database = withDb();
  const tables = [
    "iot_rooms",
    "iot_devices",
    "iot_readings",
    "iot_room_snapshots",
    "iot_alerts",
    "iot_policy_profiles",
    "agent_runs",
  ];
  const tx = database.transaction(() => {
    for (const table of tables.slice().reverse()) {
      database.prepare(`DELETE FROM ${table}`).run();
    }
    for (const table of tables) {
      const rows = payload.tables[table] || [];
      if (!rows.length) continue;
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => "?").join(", ");
      const insert = database.prepare(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
      );
      for (const row of rows) {
        insert.run(...columns.map((column) => row[column]));
      }
    }
  });
  tx();
}

function parseWindowMs(window) {
  const value = String(window || "24h").toLowerCase();
  if (value.endsWith("h")) return Number(value.replace(/h$/, "")) * 60 * 60 * 1000;
  if (value.endsWith("d")) return Number(value.replace(/d$/, "")) * 24 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

export function createAgentResponse(agent, payload) {
  return {
    status: "success",
    generatedAt: nowIso(),
    traceId: createTraceId(agent.toLowerCase()),
    agent,
    ...payload,
  };
}
