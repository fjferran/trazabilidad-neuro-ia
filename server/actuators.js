import fs from "fs/promises";
import path from "path";
import axios from "axios";

let actuatorState = {
  rootDir: null,
  configPath: null,
  config: { actuators: [] },
  automation: {
    timer: null,
    roomStatusProvider: null,
    runtime: {},
  },
};

const ROOM_ALIASES = {
  "sala de clones": "Sala de Clones",
  clones: "Sala de Clones",
  "sala de madres": "Sala de Madres",
  madres: "Sala de Madres",
  "sala de vegetativo": "Sala de Vegetativo",
  vegetativo: "Sala de Vegetativo",
  "sala de floracion": "Sala de Floración",
  floracion: "Sala de Floración",
  "almacen cosecha": "Almacén Cosecha",
  almacen: "Almacén Cosecha",
};

const METRIC_ALIASES = {
  temperatura: "ambient.t",
  "temperatura sala": "ambient.t",
  humedad: "ambient.h",
  "humedad sala": "ambient.h",
  vpd: "ambient.vpd",
  dli: "ambient.dli",
  "temperatura sustrato": "substrate.t",
  "t sustrato": "substrate.t",
  ec: "fertigation.ec",
  ph: "fertigation.ph",
};

function nowIso() {
  return new Date().toISOString();
}

function assertInitialized() {
  if (!actuatorState.rootDir) throw new Error("Módulo de actuadores no inicializado");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function sanitizeActuator(actuator) {
  return {
    id: actuator.id,
    name: actuator.name,
    room: actuator.room,
    category: actuator.category,
    driver: actuator.driver,
    ip: actuator.ip,
    relay: actuator.relay,
    enabled: Boolean(actuator.enabled),
    notes: actuator.notes || "",
    automation: {
      enabled: Boolean(actuator.automation?.enabled),
      metric: actuator.automation?.metric || null,
      comparator: actuator.automation?.comparator || null,
      threshold: actuator.automation?.threshold ?? null,
      desiredState: Boolean(actuator.automation?.desiredState),
      durationSeconds: actuator.automation?.durationSeconds ?? 0,
      cooldownSeconds: actuator.automation?.cooldownSeconds ?? 0,
      runtime: actuatorState.automation.runtime[actuator.id] || null,
    },
  };
}

async function saveActuatorConfig() {
  assertInitialized();
  await fs.writeFile(
    actuatorState.configPath,
    `${JSON.stringify(actuatorState.config, null, 2)}\n`,
    "utf8",
  );
}

function getMetricValueFromStatus(roomStatus, metricPath) {
  if (!roomStatus || !metricPath) return null;
  return metricPath.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), roomStatus.metrics);
}

function compareMetric(value, comparator, threshold) {
  if (value === null || value === undefined) return false;
  switch (comparator) {
    case ">":
      return value > threshold;
    case ">=":
      return value >= threshold;
    case "<":
      return value < threshold;
    case "<=":
      return value <= threshold;
    case "=":
    case "==":
      return value === threshold;
    default:
      return false;
  }
}

async function evaluateAutomationForActuator(actuator) {
  const runtime = actuatorState.automation.runtime[actuator.id] || {
    lastSatisfiedAt: null,
    lastTriggeredAt: null,
    lastEvaluationAt: null,
    lastDecision: null,
    lastError: null,
  };
  actuatorState.automation.runtime[actuator.id] = runtime;

  if (!actuator.enabled || !actuator.automation?.enabled) {
    runtime.lastDecision = "disabled";
    runtime.lastEvaluationAt = nowIso();
    return;
  }

  const roomStatus = actuatorState.automation.roomStatusProvider?.(actuator.room);
  const metricValue = getMetricValueFromStatus(roomStatus, actuator.automation.metric);
  const matches = compareMetric(
    metricValue,
    actuator.automation.comparator,
    Number(actuator.automation.threshold),
  );
  const now = Date.now();
  runtime.lastEvaluationAt = nowIso();
  runtime.lastError = null;

  if (!matches) {
    runtime.lastSatisfiedAt = null;
    runtime.lastDecision = "condition_not_met";
    return;
  }

  if (!runtime.lastSatisfiedAt) {
    runtime.lastSatisfiedAt = nowIso();
    runtime.lastDecision = "condition_started";
    return;
  }

  const satisfiedFor = now - new Date(runtime.lastSatisfiedAt).getTime();
  if (satisfiedFor < Number(actuator.automation.durationSeconds || 0) * 1000) {
    runtime.lastDecision = "waiting_duration";
    return;
  }

  if (runtime.lastTriggeredAt) {
    const cooldownFor = now - new Date(runtime.lastTriggeredAt).getTime();
    if (cooldownFor < Number(actuator.automation.cooldownSeconds || 0) * 1000) {
      runtime.lastDecision = "cooldown";
      return;
    }
  }

  try {
    const currentStatus = await fetchShellyStatus(actuator);
    if (currentStatus.state === Boolean(actuator.automation.desiredState)) {
      runtime.lastDecision = "already_in_desired_state";
      return;
    }
    await setActuatorState(actuator.id, Boolean(actuator.automation.desiredState), "automation");
    runtime.lastTriggeredAt = nowIso();
    runtime.lastDecision = "triggered";
  } catch (error) {
    runtime.lastError = error.message;
    runtime.lastDecision = "error";
  }
}

function startAutomationLoop() {
  if (actuatorState.automation.timer) clearInterval(actuatorState.automation.timer);
  actuatorState.automation.timer = setInterval(() => {
    (actuatorState.config.actuators || []).forEach((actuator) => {
      evaluateAutomationForActuator(actuator).catch(() => {});
    });
  }, 15000);
}

export async function initActuators(rootDir, options = {}) {
  const configPath = path.join(rootDir, "server", "actuators.json");
  const raw = await fs.readFile(configPath, "utf8");
  const config = JSON.parse(raw);
  actuatorState = {
    rootDir,
    configPath,
    config,
    automation: {
      timer: actuatorState.automation.timer,
      roomStatusProvider: options.getRoomStatus || actuatorState.automation.roomStatusProvider,
      runtime: actuatorState.automation.runtime || {},
    },
  };
  startAutomationLoop();
  return { count: config.actuators?.length || 0 };
}

export async function reloadActuators() {
  assertInitialized();
  return initActuators(actuatorState.rootDir, {
    getRoomStatus: actuatorState.automation.roomStatusProvider,
  });
}

function getActuatorById(id) {
  assertInitialized();
  return actuatorState.config.actuators.find((item) => item.id === id) || null;
}

function buildShellyBaseUrl(actuator) {
  return `http://${actuator.ip}`;
}

function findActuatorByName(text) {
  const normalized = normalizeText(text);
  return (actuatorState.config.actuators || []).find((actuator) => normalized.includes(normalizeText(actuator.name)));
}

function findRoomByText(text) {
  const normalized = normalizeText(text);
  return Object.entries(ROOM_ALIASES).find(([alias]) => normalized.includes(alias))?.[1] || null;
}

function findMetricByText(text) {
  const normalized = normalizeText(text);
  return Object.entries(METRIC_ALIASES).find(([alias]) => normalized.includes(alias))?.[1] || null;
}

function findComparator(text) {
  const normalized = normalizeText(text);
  if (normalized.includes("por debajo de") || normalized.includes("menor que") || normalized.includes("<=")) return "<";
  if (normalized.includes("por encima de") || normalized.includes("mayor que") || normalized.includes(">=")) return ">";
  if (normalized.includes("igual a")) return "==";
  if (normalized.includes("<")) return "<";
  if (normalized.includes(">")) return ">";
  return null;
}

function extractFirstNumberAfter(text, marker) {
  const normalized = normalizeText(text);
  const index = normalized.indexOf(marker);
  if (index === -1) return null;
  const slice = normalized.slice(index + marker.length);
  const match = slice.match(/(\d+(?:[\.,]\d+)?)/);
  return match ? Number(match[1].replace(",", ".")) : null;
}

export function parseAutomationInstruction(text) {
  assertInitialized();
  const actuator = findActuatorByName(text);
  const room = findRoomByText(text) || actuator?.room || null;
  const metric = findMetricByText(text);
  const comparator = findComparator(text);
  const threshold = extractFirstNumberAfter(text, comparator === ">" ? "de" : "de") || (() => {
    const match = normalizeText(text).match(/(?:<|>|igual a|por debajo de|por encima de|menor que|mayor que)\s*(\d+(?:[\.,]\d+)?)/);
    return match ? Number(match[1].replace(",", ".")) : null;
  })();
  const durationSeconds = (() => {
    const match = normalizeText(text).match(/durante\s*(\d+)\s*seg/);
    return match ? Number(match[1]) : null;
  })();
  const cooldownSeconds = (() => {
    const match = normalizeText(text).match(/cooldown\s*(?:de)?\s*(\d+)\s*seg/);
    return match ? Number(match[1]) : null;
  })();
  const desiredState = normalizeText(text).includes(" off") || normalizeText(text).includes(" en off") || normalizeText(text).includes("apagar") ? false : true;

  const missing = [];
  if (!actuator) missing.push("actuador");
  if (!room) missing.push("sala");
  if (!metric) missing.push("métrica");
  if (!comparator) missing.push("comparador");
  if (threshold === null || Number.isNaN(threshold)) missing.push("umbral");
  if (durationSeconds === null) missing.push("duración");
  if (cooldownSeconds === null) missing.push("cooldown");

  return {
    valid: missing.length === 0,
    missing,
    actuator: actuator ? sanitizeActuator(actuator) : null,
    room,
    automation: {
      enabled: true,
      metric,
      comparator,
      threshold,
      desiredState,
      durationSeconds,
      cooldownSeconds,
    },
  };
}

async function fetchShellyStatus(actuator) {
  const baseUrl = buildShellyBaseUrl(actuator);
  const relay = Number(actuator.relay || 0);
  const [relayResponse, statusResponse] = await Promise.all([
    axios.get(`${baseUrl}/relay/${relay}`, { timeout: 5000 }),
    axios.get(`${baseUrl}/status`, { timeout: 5000 }),
  ]);
  return {
    state: Boolean(relayResponse.data?.ison),
    source: "live",
    power: relayResponse.data?.power ?? null,
    uptime: statusResponse.data?.uptime ?? null,
    wifi: statusResponse.data?.wifi_sta?.connected ?? null,
    updatedAt: nowIso(),
  };
}

export async function listActuators() {
  assertInitialized();
  const items = await Promise.all(
    (actuatorState.config.actuators || []).map(async (actuator) => {
      const sanitized = sanitizeActuator(actuator);
      if (!sanitized.enabled) {
        return {
          ...sanitized,
          status: {
            state: null,
            source: "disabled",
            updatedAt: null,
            error: "Actuador deshabilitado en configuración",
          },
        };
      }
      try {
        const status = await fetchShellyStatus(actuator);
        return { ...sanitized, status };
      } catch (error) {
        return {
          ...sanitized,
          status: {
            state: null,
            source: "error",
            updatedAt: nowIso(),
            error: error.message,
          },
        };
      }
    }),
  );
  return items;
}

export async function setActuatorState(id, targetState, actor = "system") {
  const actuator = getActuatorById(id);
  if (!actuator) throw new Error("Actuador no encontrado");
  if (!actuator.enabled) throw new Error("Actuador deshabilitado en configuración");
  const relay = Number(actuator.relay || 0);
  const turn = targetState ? "on" : "off";
  const baseUrl = buildShellyBaseUrl(actuator);
  await axios.get(`${baseUrl}/relay/${relay}`, {
    params: { turn },
    timeout: 5000,
  });
  const status = await fetchShellyStatus(actuator);
  return {
    actuator: sanitizeActuator(actuator),
    status,
    actor,
    requestedState: targetState,
  };
}

export function getActuatorsHealth() {
  assertInitialized();
  return {
    configured: actuatorState.config.actuators?.length || 0,
    enabled: (actuatorState.config.actuators || []).filter((item) => item.enabled).length,
    automationEnabled: (actuatorState.config.actuators || []).filter((item) => item.automation?.enabled).length,
    configPath: path.relative(actuatorState.rootDir, actuatorState.configPath),
  };
}

export async function updateActuatorAutomation(id, automationPatch = {}) {
  const actuator = getActuatorById(id);
  if (!actuator) throw new Error("Actuador no encontrado");
  actuator.automation = {
    ...(actuator.automation || {}),
    ...automationPatch,
    threshold:
      automationPatch.threshold !== undefined
        ? Number(automationPatch.threshold)
        : Number(actuator.automation?.threshold ?? 0),
    durationSeconds:
      automationPatch.durationSeconds !== undefined
        ? Number(automationPatch.durationSeconds)
        : Number(actuator.automation?.durationSeconds ?? 0),
    cooldownSeconds:
      automationPatch.cooldownSeconds !== undefined
        ? Number(automationPatch.cooldownSeconds)
        : Number(actuator.automation?.cooldownSeconds ?? 0),
  };
  await saveActuatorConfig();
  return sanitizeActuator(actuator);
}

export async function applyAutomationInstruction(text) {
  const parsed = parseAutomationInstruction(text);
  if (!parsed.valid || !parsed.actuator) {
    throw new Error(`No se pudo interpretar la instrucción. Faltan: ${parsed.missing.join(", ")}`);
  }
  return updateActuatorAutomation(parsed.actuator.id, parsed.automation);
}
