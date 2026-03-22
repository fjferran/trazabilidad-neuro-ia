import fs from "fs/promises";
import path from "path";
import pdfParse from "pdf-parse";
import OpenAI from "openai";

let ragState = {
  ready: false,
  rootDir: null,
  docs: [],
  chunks: [],
  lastIndexedAt: null,
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function splitIntoChunks(text, size = 1400, overlap = 180) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(clean.length, start + size);
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks.filter(Boolean);
}

function scoreChunk(question, chunk) {
  const questionTokens = tokenize(question);
  const chunkTokens = new Set(tokenize(chunk.text));
  let score = 0;
  for (const token of questionTokens) {
    if (chunkTokens.has(token)) score += 1;
  }
  const normalizedQuestion = normalizeText(question);
  if (normalizeText(chunk.text).includes(normalizedQuestion.slice(0, 32))) {
    score += 3;
  }
  return score;
}

async function readDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    const buffer = await fs.readFile(filePath);
    const parsed = await pdfParse(buffer);
    return parsed.text || "";
  }
  return fs.readFile(filePath, "utf8");
}

async function scanFiles(dirPath, accumulator = []) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await scanFiles(fullPath, accumulator);
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (![".md", ".txt", ".pdf", ".json"].includes(ext)) continue;
    if (entry.name === "credenciales.json" || entry.name === "package-lock.json") continue;
    accumulator.push(fullPath);
  }
  return accumulator;
}

function buildDocMetadata(rootDir, filePath) {
  return {
    path: path.relative(rootDir, filePath),
    title: path.basename(filePath),
    type: path.extname(filePath).toLowerCase().replace(".", "") || "text",
  };
}

export async function initRag(rootDir) {
  const validatedInfoDir = path.join(rootDir, "validated_info");
  await fs.mkdir(validatedInfoDir, { recursive: true });

  const seedPaths = [
    path.join(rootDir, "README.md"),
    path.join(rootDir, "SOP_Trazabilidad_Neuro-IA.md"),
    path.join(rootDir, "SOP_IOT_001_Monitorizacion_IoT_GACP.md"),
    path.join(rootDir, "docs"),
    path.join(rootDir, "traza_argentina"),
    validatedInfoDir,
  ];

  const files = [];
  for (const seed of seedPaths) {
    try {
      const stat = await fs.stat(seed);
      if (stat.isDirectory()) {
        await scanFiles(seed, files);
      } else {
        files.push(seed);
      }
    } catch {
      // ignore missing paths
    }
  }

  const docs = [];
  const chunks = [];
  for (const filePath of [...new Set(files)]) {
    try {
      const text = await readDocument(filePath);
      if (!text.trim()) continue;
      const metadata = buildDocMetadata(rootDir, filePath);
      docs.push(metadata);
      const docChunks = splitIntoChunks(text).map((chunkText, index) => ({
        id: `${metadata.path}#${index + 1}`,
        text: chunkText,
        metadata,
      }));
      chunks.push(...docChunks);
    } catch (error) {
      docs.push({
        path: path.relative(rootDir, filePath),
        title: path.basename(filePath),
        type: "error",
        error: error.message,
      });
    }
  }

  ragState = {
    ready: true,
    rootDir,
    docs,
    chunks,
    lastIndexedAt: nowIso(),
  };
  return { docs: docs.length, chunks: chunks.length, lastIndexedAt: ragState.lastIndexedAt };
}

export async function refreshRagIndex() {
  if (!ragState.rootDir) throw new Error("RAG no inicializado");
  return initRag(ragState.rootDir);
}

export function getRagHealth() {
  return {
    ready: ragState.ready,
    documents: ragState.docs.length,
    chunks: ragState.chunks.length,
    lastIndexedAt: ragState.lastIndexedAt,
  };
}

export function searchRag(question, limit = 6) {
  if (!ragState.ready) return [];
  return ragState.chunks
    .map((chunk) => ({ ...chunk, score: scoreChunk(question, chunk) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function buildOperationalContext(roomStatus, qrContext, activeAlerts) {
  const lines = [];
  if (roomStatus?.room) {
    lines.push(`Sala: ${roomStatus.room}`);
    lines.push(`Estado IoT: ${roomStatus.classification?.status || roomStatus.status}`);
    lines.push(`Resumen IoT: ${roomStatus.classification?.reason || roomStatus.summary || "Sin resumen"}`);
  }
  if (activeAlerts?.length) {
    const alert = activeAlerts[0];
    lines.push(`Alerta activa: ${alert.alarmCode}`);
    lines.push(`Desviación: ${(alert.deviationTypes || []).join(", ")}`);
    if (alert.deviationExplanation) lines.push(`Explicación: ${alert.deviationExplanation}`);
  }
  if (qrContext?.node?.id) {
    lines.push(`Lote/QR: ${qrContext.node.id}`);
    lines.push(`Tipo: ${qrContext.type}`);
    if (qrContext.iot?.room) lines.push(`Sala del lote: ${qrContext.iot.room}`);
    if (qrContext.iot?.summary) lines.push(`Resumen de sala del lote: ${qrContext.iot.summary}`);
  }
  return lines.join("\n");
}

function fallbackAnswer(question, retrievedChunks, roomStatus, qrContext, activeAlerts) {
  const sources = [];
  const recommendations = [];
  const operationalContext = buildOperationalContext(roomStatus, qrContext, activeAlerts);

  if (roomStatus?.room) {
    sources.push({ type: "iot_status", title: `Estado IoT · ${roomStatus.room}`, section: roomStatus.classification?.status, room: roomStatus.room });
  }
  if (qrContext?.node?.id) {
    sources.push({ type: "traceability", title: "Pasaporte de trazabilidad", qrId: qrContext.node.id, section: qrContext.type });
  }
  for (const chunk of retrievedChunks.slice(0, 3)) {
    sources.push({
      type: chunk.metadata.type,
      title: chunk.metadata.title,
      path: chunk.metadata.path,
      section: chunk.id,
    });
  }

  if (!retrievedChunks.length && !operationalContext) {
    return {
      answer:
        "No encuentro información validada suficiente en la documentación indexada ni en el contexto operativo actual para responder sin arriesgar una alucinación.",
      recommendations: [
        "Sube el documento validado a `validated_info/` o revisa si el SOP/manual correspondiente ya está indexado.",
      ],
      sources,
      confidence: 0.3,
      needsHumanReview: true,
      scope: qrContext?.node?.id ? "traceability" : "iot",
    };
  }

  const excerpts = retrievedChunks.slice(0, 2).map((chunk) => chunk.text.slice(0, 360));
  const parts = [];
  if (operationalContext) {
    parts.push(`Contexto operativo:\n${operationalContext}`);
  }
  if (excerpts.length) {
    parts.push(`Información validada recuperada:\n${excerpts.join("\n\n")}`);
  }
  if (activeAlerts?.length) {
    recommendations.push(...(activeAlerts[0].immediateActions || []).slice(0, 3));
  }

  return {
    answer: parts.join("\n\n"),
    recommendations: [...new Set(recommendations)].slice(0, 4),
    sources,
    confidence: retrievedChunks.length ? 0.78 : 0.7,
    needsHumanReview: retrievedChunks.length === 0,
    scope: qrContext?.node?.id ? "traceability" : "iot",
  };
}

export async function answerRagQuestion({ question, roomStatus, qrContext, activeAlerts }) {
  const retrievedChunks = searchRag(question, 6);
  const operationalContext = buildOperationalContext(roomStatus, qrContext, activeAlerts);

  if (!process.env.OPENAI_API_KEY) {
    return fallbackAnswer(question, retrievedChunks, roomStatus, qrContext, activeAlerts);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const contextBlocks = [];
  if (operationalContext) contextBlocks.push(`## Contexto operativo\n${operationalContext}`);
  if (retrievedChunks.length) {
    contextBlocks.push(
      `## Documentación validada\n${retrievedChunks
        .map((chunk, index) => `[${index + 1}] ${chunk.metadata.path}\n${chunk.text}`)
        .join("\n\n")}`,
    );
  }

  if (!contextBlocks.length) {
    return fallbackAnswer(question, retrievedChunks, roomStatus, qrContext, activeAlerts);
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content:
          "Eres S1 Chat-Agent de un sistema de trazabilidad e IoT. Responde solo con la información contenida en el contexto proporcionado. Si no encuentras base suficiente, di explícitamente que no puedes responder con seguridad. No inventes valores, documentos ni recomendaciones que no estén sustentadas en el contexto.",
      },
      {
        role: "user",
        content: `Pregunta: ${question}\n\n${contextBlocks.join("\n\n")}`,
      },
    ],
  });

  const sources = retrievedChunks.slice(0, 3).map((chunk) => ({
    type: chunk.metadata.type,
    title: chunk.metadata.title,
    path: chunk.metadata.path,
    section: chunk.id,
  }));
  if (roomStatus?.room) {
    sources.unshift({ type: "iot_status", title: `Estado IoT · ${roomStatus.room}`, section: roomStatus.classification?.status, room: roomStatus.room });
  }
  if (qrContext?.node?.id) {
    sources.unshift({ type: "traceability", title: "Pasaporte de trazabilidad", qrId: qrContext.node.id, section: qrContext.type });
  }

  return {
    answer: response.output_text || "No se pudo generar una respuesta con el contexto disponible.",
    recommendations: activeAlerts?.[0]?.immediateActions?.slice(0, 3) || [],
    sources,
    confidence: retrievedChunks.length ? 0.9 : 0.65,
    needsHumanReview: !retrievedChunks.length,
    scope: qrContext?.node?.id ? "traceability" : "iot",
  };
}
