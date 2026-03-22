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
  const metadataTokens = new Set(
    tokenize(`${chunk.metadata.title} ${chunk.metadata.path} ${(chunk.metadata.keywords || []).join(" ")}`),
  );
  let score = 0;
  for (const token of questionTokens) {
    if (chunkTokens.has(token)) score += 1;
    if (metadataTokens.has(token)) score += 3;
  }
  const normalizedQuestion = normalizeText(question);
  if (normalizeText(chunk.text).includes(normalizedQuestion.slice(0, 32))) {
    score += 3;
  }
  const titlePath = normalizeText(`${chunk.metadata.title} ${chunk.metadata.path}`);
  if (normalizedQuestion.split(/\s+/).some((part) => part.length > 3 && titlePath.includes(part))) {
    score += 4;
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
  const baseName = path.basename(filePath);
  const title = baseName;
  const titleWithoutExt = title.replace(path.extname(title), "");
  return {
    path: path.relative(rootDir, filePath),
    title,
    type: path.extname(filePath).toLowerCase().replace(".", "") || "text",
    keywords: tokenize(titleWithoutExt.replace(/[_-]/g, " ")),
  };
}

function extractCandidateTerms(question) {
  const normalized = normalizeText(question);
  const tokens = tokenize(normalized);
  const candidates = new Set();
  for (const doc of ragState.docs) {
    const title = doc.title?.replace(path.extname(doc.title || ""), "") || "";
    const geneticsLike = title.split(/[_-]/)[0]?.trim();
    if (!geneticsLike) continue;
    const norm = normalizeText(geneticsLike);
    if (norm && normalized.includes(norm)) candidates.add(geneticsLike);
  }
  for (const token of tokens) {
    for (const doc of ragState.docs) {
      const haystack = normalizeText(`${doc.title} ${doc.path}`);
      if (haystack.includes(token)) candidates.add(token);
    }
  }
  return [...candidates];
}

function findMatchingDocuments(question) {
  const normalized = normalizeText(question);
  const candidateTerms = extractCandidateTerms(question);
  const docs = ragState.docs.filter((doc) => {
    const haystack = normalizeText(`${doc.title} ${doc.path}`);
    if (candidateTerms.some((term) => haystack.includes(normalizeText(term)))) return true;
    return tokenize(question).some((token) => haystack.includes(token));
  });
  return docs
    .filter((doc) => doc.type !== "error")
    .sort((a, b) => a.path.localeCompare(b.path));
}

function buildDocumentListingAnswer(question) {
  const matchingDocs = findMatchingDocuments(question);
  if (!(normalizeText(question).includes("genet") || normalizeText(question).includes("document"))) {
    return null;
  }
  if (!matchingDocs.length) return null;
  const listed = matchingDocs.slice(0, 8).map((doc) => `- ${doc.path}`).join("\n");
  return {
    answer: `He encontrado documentación validada relacionada con tu consulta:\n${listed}`,
    recommendations: [
      "Si necesitas detalle de una genética concreta, indica también el nombre exacto y el tipo de documento que buscas.",
    ],
    sources: matchingDocs.slice(0, 5).map((doc) => ({
      type: doc.type,
      title: doc.title,
      path: doc.path,
      section: "document_match",
    })),
    confidence: 0.85,
    needsHumanReview: false,
    scope: "documentation",
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
      const metadata = buildDocMetadata(rootDir, filePath);
      docs.push(metadata);
      const text = await readDocument(filePath);
      if (!text.trim()) continue;
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

function buildGeneticsOperationalAnswer(question, geneticsContext) {
  const normalized = normalizeText(question);
  if (!geneticsContext?.total) return null;
  const asksCount =
    (normalized.includes("cuantas genet") || normalized.includes("cuántas genet") || normalized.includes("numero de genet") || normalized.includes("número de genet")) &&
    (normalized.includes("hay") || normalized.includes("tenemos") || normalized.includes("registrad"));
  if (!asksCount) return null;

  const listed = geneticsContext.varieties.length
    ? ` Las variedades visibles en trazabilidad son: ${geneticsContext.varieties.join(", ")}.`
    : "";
  return {
    answer: `Actualmente hay ${geneticsContext.total} genéticas registradas en la trazabilidad.${listed}`,
    recommendations: [],
    sources: [
      {
        type: "traceability",
        title: "Inventario de genéticas en trazabilidad",
        section: "Sheet_Genetica",
      },
    ],
    confidence: 0.97,
    needsHumanReview: false,
    scope: "traceability",
  };
}

function fallbackAnswer(question, retrievedChunks, roomStatus, qrContext, activeAlerts, geneticsContext) {
  const sources = [];
  const recommendations = [];
  const operationalContext = buildOperationalContext(roomStatus, qrContext, activeAlerts);

  const geneticsAnswer = buildGeneticsOperationalAnswer(question, geneticsContext);
  if (geneticsAnswer) return geneticsAnswer;

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

  const listingAnswer = buildDocumentListingAnswer(question);
  if (listingAnswer) return listingAnswer;

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

export async function answerRagQuestion({ question, roomStatus, qrContext, activeAlerts, geneticsContext }) {
  const listingAnswer = buildDocumentListingAnswer(question);
  if (listingAnswer) return listingAnswer;

  const retrievedChunks = searchRag(question, 6);
  const operationalContext = buildOperationalContext(roomStatus, qrContext, activeAlerts);

  if (!process.env.OPENAI_API_KEY) {
    return fallbackAnswer(question, retrievedChunks, roomStatus, qrContext, activeAlerts, geneticsContext);
  }

  const geneticsAnswer = buildGeneticsOperationalAnswer(question, geneticsContext);
  if (geneticsAnswer) return geneticsAnswer;

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
    return fallbackAnswer(question, retrievedChunks, roomStatus, qrContext, activeAlerts, geneticsContext);
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
