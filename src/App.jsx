import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";
import {
  Leaf,
  Search,
  PlusCircle,
  QrCode,
  Activity,
  ChevronRight,
  Dna,
  FileCheck,
  TrendingUp,
  ArrowUpRight,
  Package,
  Sprout,
  Sun,
  Scissors,
  Menu,
  X,
  Zap,
  Database,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";

// ─── UTILS ───────────────────────────────────────────────

const cn = (...classes) => classes.filter(Boolean).join(" ");
const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const IOT_ROOMS = [
  "Sala de Clones",
  "Sala de Madres",
  "Sala de Vegetativo",
  "Sala de Floración",
  "Almacén Cosecha",
];

const getSyncBadgeClass = (status) => {
  if (status === "pending_sync") return "bg-amber-50 text-amber-700";
  if (status === "conflict") return "bg-orange-50 text-orange-700";
  if (status === "sync_error") return "bg-red-50 text-red-700";
  return "bg-emerald-50 text-emerald-700";
};

const getIotBadgeClass = (status) => {
  if (status === "ALARM" || status === "OFFLINE")
    return "bg-red-50 text-red-700 border-red-200";
  if (status === "WARNING" || status === "STALE")
    return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
};

const formatMetricValue = (value, unit = "") => {
  if (value === null || value === undefined || value === "") return "N/D";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return `${numeric.toFixed(numeric >= 10 ? 1 : 2)}${unit ? ` ${unit}` : ""}`;
};

const auditActionLabels = {
  node_view: "Lectura de nodo",
  local_append: "Alta local",
  local_update: "Edición local",
  remote_append_synced: "Alta sincronizada con Google Sheets",
  remote_update_synced: "Edición sincronizada con Google Sheets",
  sync_error: "Error de sincronización",
  sync_conflict: "Conflicto de sincronización",
  queue_retry: "Reintento de cola",
  queue_discarded: "Operación descartada",
  conflict_resolve_local: "Conflicto resuelto manteniendo local",
  conflict_resolve_remote: "Conflicto resuelto manteniendo remoto",
  backup_restored: "Backup restaurado",
};

const getAuditActionLabel = (action) => auditActionLabels[action] || action;

const roleDefinitions = {
  operario: {
    label: "Operario",
    description: "Altas operativas y consulta diaria",
  },
  qa: {
    label: "Calidad",
    description: "Verificación, auditoría y trazabilidad",
  },
  cultivo: {
    label: "Dirección Cultivo",
    description: "Supervisión operativa y decisiones de cultivo",
  },
  tecnico: {
    label: "Técnico Sistema",
    description: "Sync, backups, conflictos y mantenimiento",
  },
};

const getRoleLabel = (role) => roleDefinitions[role]?.label || role || "Sistema";

const defaultUsers = [
  { id: "op1", name: "Operario Sala", role: "operario" },
  { id: "qa1", name: "Responsable QA", role: "qa" },
  { id: "cult1", name: "Dirección Cultivo", role: "cultivo" },
  { id: "tec1", name: "Técnico Sistema", role: "tecnico" },
];

const rolePermissions = {
  operario: [
    "dashboard",
    "iot",
    "labores",
    "admin",
    "search",
    "qr",
    "genetics",
    "audit",
  ],
  qa: ["dashboard", "iot", "labores", "search", "audit", "genetics"],
  cultivo: [
    "dashboard",
    "iot",
    "labores",
    "admin",
    "search",
    "qr",
    "audit",
    "genetics",
  ],
  tecnico: [
    "dashboard",
    "iot",
    "labores",
    "admin",
    "search",
    "qr",
    "audit",
    "genetics",
  ],
};

const canAccessPage = (role, pageId) =>
  (rolePermissions[role] || []).includes(pageId);

const canSyncSystem = (role) => ["tecnico", "cultivo"].includes(role);
const canEditNode = (role) => ["tecnico", "cultivo"].includes(role);

function LoginView({ onLogin }) {
  const [selectedUserId, setSelectedUserId] = useState(defaultUsers[0].id);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
      <div className="glass-card p-10 w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200">
            <Leaf size={28} className="text-emerald-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Neuro-IA Trazabilidad
          </h1>
          <p className="text-sm font-semibold text-slate-600">
            Selecciona usuario local para entrar en la consola operativa.
          </p>
        </div>

        <div>
          <label className="label-text">Usuario</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="input-light"
          >
            {defaultUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({roleDefinitions[user.role]?.label || user.role})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => onLogin(defaultUsers.find((u) => u.id === selectedUserId))}
          className="btn-glow w-full"
        >
          Entrar
        </button>
      </div>
    </div>
  );
}

// ─── METRIC CARD ─────────────────────────────────────────

function MetricCard({ title, value, icon: Icon, accent, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card-hover p-8 cursor-default group"
    >
      <div className="flex items-start justify-between mb-8">
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center",
            accent,
          )}
        >
          <Icon size={24} className="text-white" />
        </div>
        <div className="flex items-center gap-1.5 pill bg-emerald-50 text-emerald-700">
          <Zap size={10} /> LIVE
        </div>
      </div>
      <p className="label-text">{title}</p>
      <h3 className="stat-number">{value}</h3>
    </motion.div>
  );
}

function IotRoomCard({ room, delay = 0 }) {
  const currentTemp = room?.metrics?.ambient?.t;
  const currentHum = room?.metrics?.ambient?.h;
  const subtitle =
    room?.room === "Almacén Cosecha"
      ? `T ${formatMetricValue(currentTemp, "C")} · H ${formatMetricValue(currentHum, "%")}`
      : `T ${formatMetricValue(currentTemp, "C")} · H ${formatMetricValue(currentHum, "%")} · VPD ${formatMetricValue(room?.metrics?.ambient?.vpd, "kPa")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-slate-900">{room?.room}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {subtitle}
          </p>
        </div>
        <span
          className={cn(
            "px-3 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest",
            getIotBadgeClass(room?.classification?.status),
          )}
        >
          {room?.classification?.status || "N/D"}
        </span>
      </div>
      <p className="text-sm font-bold text-slate-700 leading-relaxed">
        {room?.classification?.reason || "Sin datos recientes para esta sala."}
      </p>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>Frescura: {room?.dataQuality?.freshnessSeconds ?? "N/D"} s</span>
        <span>{room?.lastUpdatedAt ? new Date(room.lastUpdatedAt).toLocaleString("es-ES") : "Sin actualización"}</span>
      </div>
    </motion.div>
  );
}

function IotAlertPanel({ alerts = [] }) {
  return (
    <motion.div {...fadeUp} transition={{ delay: 0.15 }} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-500" /> Alertas IoT activas
        </h3>
        <span className="pill bg-slate-100 text-slate-600">{alerts.length}</span>
      </div>
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <p className="text-sm font-semibold text-slate-500">
            No hay alertas activas en este momento.
          </p>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id || alert.alarmCode} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-slate-900">{alert.room}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {alert.alarmCode}
                  </p>
                </div>
                <span
                  className={cn(
                    "px-3 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest",
                    getIotBadgeClass(alert.severity === "high" ? "ALARM" : "WARNING"),
                  )}
                >
                  {alert.severity}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-700">{alert.reason}</p>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ─── ACTIVITY FEED ───────────────────────────────────────

function ActivityFeed({ activity }) {
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  };

  return (
    <motion.div
      {...fadeUp}
      transition={{ delay: 0.3 }}
      className="glass-card p-8"
    >
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
          <Activity size={20} className="text-emerald-600" /> Actividad Reciente
        </h3>
        <span className="pill bg-slate-100 text-slate-600">
          {activity?.length || 0} Reg.
        </span>
      </div>
      <div className="space-y-1">
        {!activity || activity.length === 0 ? (
          <div className="text-center p-4 text-slate-500 text-sm font-semibold">
            No hay actividad registrada aún.
          </div>
        ) : (
          activity.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors group cursor-default"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                {item.type === "madre" ? (
                  <Leaf size={18} />
                ) : item.type === "clon" ? (
                  <Sprout size={18} />
                ) : item.type === "floracion" ? (
                  <Sun size={18} />
                ) : item.type === "cosecha" ? (
                  <Scissors size={18} />
                ) : (
                  <Package size={18} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {item.id}
                </p>
                <p className="text-sm text-slate-600 font-semibold">
                  {item.action}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-600 font-bold">
                  {formatTime(item.date)}
                </p>
              </div>
              <div
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  item.status === "ok"
                    ? "bg-emerald-500"
                    : item.status === "warning"
                      ? "bg-amber-500"
                      : item.status === "done"
                        ? "bg-blue-500"
                        : "bg-slate-600",
                )}
              />
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ─── MINI CHART ──────────────────────────────────────────

function MiniChart({ chartData }) {
  // Encontrar el valor maximo para normalizar las barras de 0 a 100%
  const data = chartData || Array(12).fill(0);
  const maxVal = Math.max(...data, 1); // Evitar division por cero

  // Nombres de meses simplificados
  const months = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const currentMonth = new Date().getMonth(); // 0 a 11

  return (
    <motion.div
      {...fadeUp}
      transition={{ delay: 0.4 }}
      className="glass-card p-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Producción Anual</h3>
          <p className="text-sm text-slate-600 mt-1 font-semibold">
            Peso Húmedo total mensual (g)
          </p>
        </div>
      </div>
      <div className="flex items-end gap-2 h-40 mt-4">
        {data.map((val, i) => {
          const height = Math.max((val / maxVal) * 100, 5); // min 5% para que se vea la barra
          return (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: val > 0 ? `${height}%` : "5px" }}
              transition={{
                delay: 0.5 + i * 0.05,
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
              }}
              title={`${val}g`}
              className={cn(
                "flex-1 rounded-lg transition-colors group relative",
                i === currentMonth
                  ? "bg-emerald-500"
                  : "bg-slate-200 hover:bg-slate-300",
              )}
            >
              {val > 0 && (
                <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-900 transition-opacity">
                  {val}g
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="flex justify-between mt-4 px-1">
        {months.map((m, i) => (
          <span
            key={i}
            className={cn(
              "text-[10px] font-bold",
              i === currentMonth ? "text-emerald-600" : "text-slate-400",
            )}
          >
            {m}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function SyncPanel({
  apiStatus,
  mirrorStatus,
  onSync,
  onRetry,
  onDiscard,
  onResolveLocal,
  onResolveRemote,
  onRestoreBackup,
  syncing,
  restoring,
  currentRole,
}) {
  const queue = mirrorStatus?.queue || [];
  const pending = queue.filter((item) =>
    ["pending", "sync_error", "conflict"].includes(item.status),
  );
  const backupUrl = "/api/backup/export";
  const fileInputRef = useRef(null);

  return (
    <motion.div
      {...fadeUp}
      transition={{ delay: 0.5 }}
      className="glass-card p-8"
    >
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
            <RefreshCw size={20} className="text-emerald-600" /> Sincronizacion
            Local
          </h3>
          <p className="text-sm text-slate-600 mt-1 font-semibold">
            Escritura local primero, sincronizacion posterior con Google Drive.
          </p>
        </div>
        {canSyncSystem(currentRole) && (
          <button
            onClick={onSync}
            disabled={syncing}
            className="btn-glow py-3 px-5 text-sm"
          >
            {syncing ? (
              <>
                <RefreshCw size={16} className="animate-spin" /> Sync...
              </>
            ) : (
              <>
                <RefreshCw size={16} /> Sincronizar
              </>
            )}
          </button>
        )}
      </div>

      {canSyncSystem(currentRole) && (
        <div className="flex items-center gap-3 mb-6">
          <a
            href={backupUrl}
            className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-black uppercase tracking-widest"
          >
            Exportar Backup
          </a>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onRestoreBackup(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={restoring}
            className="px-4 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-black uppercase tracking-widest disabled:opacity-50"
          >
            {restoring ? "Restaurando..." : "Importar Backup"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Fuente
          </p>
          <p className="text-sm font-black text-slate-900">
            {apiStatus?.mirror?.source || "n/d"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Pendientes
          </p>
          <p className="text-sm font-black text-slate-900">{pending.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Ultima Sync
          </p>
          <p className="text-sm font-black text-slate-900">
            {apiStatus?.mirror?.last_sync
              ? new Date(apiStatus.mirror.last_sync).toLocaleString("es-ES")
              : "Sin sync"}
          </p>
        </div>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            No hay operaciones pendientes.
          </div>
        ) : (
          pending.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-4 mb-2">
                <p className="text-sm font-black text-slate-900">
                  {item.meta?.qr_id}
                </p>
                <span
                  className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                    item.status === "sync_error"
                      ? "bg-red-50 text-red-700"
                      : item.status === "conflict"
                        ? "bg-orange-50 text-orange-700"
                        : "bg-amber-50 text-amber-700",
                  )}
                >
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-semibold">
                {item.sheetName} ·{" "}
                {item.meta?.mode || item.meta?.type || item.type || "append"}
              </p>
              {item.lastError && (
                <p className="text-xs text-red-600 font-semibold mt-2">
                  {item.lastError}
                </p>
              )}
              {item.conflict?.reason && (
                <p className="text-xs text-orange-700 font-semibold mt-2">
                  Conflicto: {item.conflict.reason}
                </p>
              )}
              {canSyncSystem(currentRole) && (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => onRetry(item.id)}
                    className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest"
                  >
                    Reintentar
                  </button>
                  <button
                    onClick={() => onDiscard(item.id)}
                    className="px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black uppercase tracking-widest"
                  >
                    Descartar
                  </button>
                  {item.status === "conflict" && (
                    <>
                      <button
                        onClick={() => onResolveLocal(item.id)}
                        className="px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-widest"
                      >
                        Mantener local
                      </button>
                      <button
                        onClick={() => onResolveRemote(item.id)}
                        className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest"
                      >
                        Mantener remoto
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {queue.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
            Historial Reciente
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {queue
              .slice()
              .reverse()
              .slice(0, 8)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {item.meta?.qr_id || item.id}
                    </p>
                    <p className="text-xs text-slate-500 font-semibold">
                      {item.sheetName}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md shrink-0",
                      item.status === "synced"
                        ? "bg-emerald-50 text-emerald-700"
                        : item.status === "conflict"
                          ? "bg-orange-50 text-orange-700"
                          : item.status === "sync_error"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────

function Dashboard({
  options,
  apiStatus,
  mirrorStatus,
  onSync,
  onRetry,
  onDiscard,
  onResolveLocal,
  onResolveRemote,
  onRestoreBackup,
  syncing,
  restoring,
  currentRole,
}) {
  // Calculamos los totales reales basados en los datos de Google Sheets
  const totalMadres = options.madres?.length || 0;
  const totalClones = options.clones?.length || 0;
  const totalFloracion = options.floraciones?.length || 0;
  const totalVegetativo = options.vegetativos?.length || 0;

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Madres Activas"
          value={totalMadres}
          icon={Leaf}
          accent="bg-emerald-600"
          delay={0}
        />
        <MetricCard
          title="Clones en Curso"
          value={totalClones}
          icon={Sprout}
          accent="bg-blue-600"
          delay={0.1}
        />
        <MetricCard
          title="En Vegetativo"
          value={totalVegetativo}
          icon={Package}
          accent="bg-amber-600"
          delay={0.2}
        />
        <MetricCard
          title="En Floración"
          value={totalFloracion}
          icon={Sun}
          accent="bg-purple-600"
          delay={0.3}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityFeed activity={options.activity} />
        <MiniChart chartData={options.chartData} />
      </div>
      <SyncPanel
        apiStatus={apiStatus}
        mirrorStatus={mirrorStatus}
        onSync={onSync}
        onRetry={onRetry}
        onDiscard={onDiscard}
        onResolveLocal={onResolveLocal}
        onResolveRemote={onResolveRemote}
        onRestoreBackup={onRestoreBackup}
        syncing={syncing}
        restoring={restoring}
        currentRole={currentRole}
      />
    </div>
  );
}

function IotDataView({ apiStatus, iotRooms, iotAlerts }) {
  const roomsOnline = apiStatus?.iot?.roomsOnline ?? iotRooms.filter((room) => ["OK", "WARNING", "ALARM"].includes(room?.classification?.status)).length;
  const staleRooms = apiStatus?.iot?.staleRooms ?? iotRooms.filter((room) => ["STALE", "OFFLINE"].includes(room?.classification?.status)).length;
  const lastTelemetry = apiStatus?.iot?.lastTelemetryAt;

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Salas con telemetría"
          value={roomsOnline}
          icon={Database}
          accent="bg-emerald-600"
          delay={0}
        />
        <MetricCard
          title="Alertas IoT"
          value={iotAlerts.length}
          icon={AlertTriangle}
          accent="bg-red-600"
          delay={0.1}
        />
        <MetricCard
          title="Salas degradadas"
          value={staleRooms}
          icon={Zap}
          accent="bg-amber-600"
          delay={0.2}
        />
        <MetricCard
          title="Broker MQTT"
          value={apiStatus?.iot?.mqttConnected ? "ONLINE" : "OFFLINE"}
          icon={Activity}
          accent={apiStatus?.iot?.mqttConnected ? "bg-blue-600" : "bg-slate-500"}
          delay={0.3}
        />
      </div>

      <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Estado general IoT
            </p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">
              Monitorización por sala
            </h3>
            <p className="text-sm font-semibold text-slate-600 mt-2">
              Última telemetría: {lastTelemetry ? new Date(lastTelemetry).toLocaleString("es-ES") : "Sin datos recientes"}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-600">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              Broker: {apiStatus?.iot?.mqttConnected ? "Conectado" : "Sin conexión"}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              SQLite: {apiStatus?.iot?.sqliteConnected ? "Activa" : "Error"}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {iotRooms.map((room, index) => (
            <IotRoomCard key={room.room} room={room} delay={index * 0.05} />
          ))}
        </div>
        <IotAlertPanel alerts={iotAlerts} />
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ─────────────────────────────────────────

function AdminPanel({ options, onRefresh }) {
  const [tab, setTab] = useState("genetica");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const initialForm = {
    variedad: "",
    qr_id: "",
    cantidad: 1,
    ubicacion: "",
    fecha: new Date().toISOString().split("T")[0],
    madre_id: "",
    origen_id: "",
    peso_humedo: "",
    linaje: "",
    documentos_url: "",
    quimiotipo: "",
    cannabinoides: "",
    terpenos: "",
    imagen_url: "",
    notas: "",
  };
  const [form, setForm] = useState(initialForm);

  const geneticaOptions = options.geneticasFull || [];
  const selectedMother = options.madres?.find((m) => m.id === form.madre_id);
  const selectedOrigin =
    (tab === "lote" && options.clones?.find((c) => c.id === form.origen_id)) ||
    (tab === "floracion" &&
      options.vegetativos?.find((v) => v.id === form.origen_id)) ||
    (tab === "cosecha" &&
      options.floraciones?.find((f) => f.id === form.origen_id)) ||
    null;

  const getMotherId = (geneticaId, fecha) => {
    const yy = (fecha || new Date().toISOString()).slice(2, 4);
    const motherPrefix = String(geneticaId || "")
      .slice(0, 3)
      .toUpperCase();
    const prefix = `${motherPrefix}-PM-`;
    const seq =
      (options.madres || [])
        .filter((m) => m.id.startsWith(prefix) && m.id.endsWith(`-${yy}`))
        .map((m) => Number(m.id.match(/-PM-(\d+)-\d{2}$/)?.[1] || 0))
        .reduce((max, n) => Math.max(max, n), 0) + 1;
    return `${motherPrefix}-PM-${seq}-${yy}`;
  };

  const getCloneId = (madreId) => {
    const prefix = `${madreId}-CL-`;
    const seq =
      (options.clones || [])
        .filter((c) => c.id.startsWith(prefix))
        .map((c) => Number(c.id.match(/-CL-(\d+)$/)?.[1] || 0))
        .reduce((max, n) => Math.max(max, n), 0) + 1;
    return `${madreId}-CL-${seq}`;
  };

  const tabs = [
    { id: "genetica", label: "GENÉTICA", icon: Dna },
    { id: "madre", label: "MADRE", icon: Leaf },
    { id: "clon", label: "CLON", icon: Sprout },
    { id: "lote", label: "VEGETAR", icon: Package },
    { id: "floracion", label: "FLOR", icon: Sun },
    { id: "cosecha", label: "COSECHA", icon: Scissors },
  ];

  // Resetear formulario al cambiar de pestaña
  useEffect(() => {
    setForm({
      ...initialForm,
      fecha: form.fecha,
      ubicacion:
        tab === "madre"
          ? "Sala de Madres"
          : tab === "lote"
            ? "Sala de Vegetativos"
            : form.ubicacion,
    });
  }, [tab]);

  useEffect(() => {
    if (tab === "madre" && form.ubicacion !== "Sala de Madres") {
      setForm((current) => ({ ...current, ubicacion: "Sala de Madres" }));
    }
    if (tab === "lote" && form.ubicacion !== "Sala de Vegetativos") {
      setForm((current) => ({ ...current, ubicacion: "Sala de Vegetativos" }));
    }
  }, [tab, form.ubicacion]);

  // Autogenerar ID de Trazabilidad
  useEffect(() => {
    let newId = "";
    if (tab === "genetica" && form.variedad) {
      newId = String(form.variedad).slice(0, 3).toUpperCase();
    } else if (tab === "madre" && form.variedad) {
      newId = getMotherId(form.variedad, form.fecha);
    } else if (tab === "clon" && form.madre_id) {
      newId = getCloneId(form.madre_id);
    } else if (tab === "lote" && form.origen_id) {
      newId = `${form.origen_id}-V`;
    } else if (tab === "floracion" && form.origen_id) {
      newId = `${form.origen_id}F`;
    } else if (tab === "cosecha" && form.origen_id) {
      newId = `${form.origen_id}C`;
    }

    if (newId && form.qr_id !== newId) {
      setForm((f) => ({ ...f, qr_id: newId }));
    } else if (!newId && form.qr_id !== "") {
      setForm((f) => ({ ...f, qr_id: "" }));
    }
  }, [tab, form.variedad, form.madre_id, form.origen_id, form.fecha, options]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      // Para clon, heredar la variedad de la madre si no la tiene
      let finalForm = { ...form, type: tab };
      if (tab === "clon" && form.madre_id && !form.variedad) {
        const madre = options.madres?.find((m) => m.id === form.madre_id);
        if (madre) finalForm.variedad = madre.variedad;
      }
      const res = await axios.post("/api/entity", finalForm);
      setSuccess(true);
      onRefresh();
      setTimeout(() => setSuccess(false), 3000);
      setForm({
        ...initialForm,
        fecha: form.fecha,
        ubicacion: form.ubicacion,
        qr_id: res.data?.qr_id || "",
      });
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tab bar */}
      <div className="flex gap-2 p-2 glass-card mb-10 w-fit mx-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2.5 px-6 py-3 rounded-2xl text-xs font-black tracking-widest transition-all duration-300",
              tab === t.id
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
            )}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Form Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          {...fadeUp}
          transition={{ duration: 0.4 }}
          className="glass-card p-10"
        >
          {/* Success Banner */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm flex items-center gap-3"
              >
                <FileCheck size={20} /> Registro sincronizado con Google Sheets
                correctamente.
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mb-10">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4">
              <PlusCircle size={28} className="text-emerald-600" /> Alta:{" "}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </h3>
            <p className="text-slate-600 text-sm mt-2 font-semibold">
              Los datos se guardan directamente en tu hoja de cálculo vía API
              segura.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Genética - solo para Madre */}
            {tab === "genetica" && (
              <>
                <div>
                  <label className="label-text">Variedad</label>
                  <input
                    type="text"
                    value={form.variedad}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        variedad: e.target.value.toUpperCase(),
                      })
                    }
                    required
                    placeholder="PACHAMAMA"
                    className="input-light"
                  />
                </div>
                <div>
                  <label className="label-text">Linaje</label>
                  <input
                    type="text"
                    value={form.linaje}
                    onChange={(e) =>
                      setForm({ ...form, linaje: e.target.value })
                    }
                    placeholder="Cruce o procedencia"
                    className="input-light"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label-text">Imagen URL</label>
                  <input
                    type="text"
                    value={form.imagen_url}
                    onChange={(e) =>
                      setForm({ ...form, imagen_url: e.target.value })
                    }
                    placeholder="https://..."
                    className="input-light"
                  />
                </div>
                <div>
                  <label className="label-text">Documentos URL</label>
                  <input
                    type="text"
                    value={form.documentos_url}
                    onChange={(e) =>
                      setForm({ ...form, documentos_url: e.target.value })
                    }
                    placeholder="https://..."
                    className="input-light"
                  />
                </div>
                <div>
                  <label className="label-text">Quimiotipo</label>
                  <input
                    type="text"
                    value={form.quimiotipo}
                    onChange={(e) =>
                      setForm({ ...form, quimiotipo: e.target.value })
                    }
                    className="input-light"
                  />
                </div>
                <div>
                  <label className="label-text">Cannabinoides URL</label>
                  <input
                    type="text"
                    value={form.cannabinoides}
                    onChange={(e) =>
                      setForm({ ...form, cannabinoides: e.target.value })
                    }
                    placeholder="https://..."
                    className="input-light"
                  />
                </div>
                <div>
                  <label className="label-text">Terpenos URL</label>
                  <input
                    type="text"
                    value={form.terpenos}
                    onChange={(e) =>
                      setForm({ ...form, terpenos: e.target.value })
                    }
                    placeholder="https://..."
                    className="input-light"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label-text">Notas</label>
                  <textarea
                    value={form.notas}
                    onChange={(e) =>
                      setForm({ ...form, notas: e.target.value })
                    }
                    rows={4}
                    className="input-light resize-none"
                  />
                </div>
              </>
            )}

            {tab === "madre" && (
              <div>
                <label className="label-text">Genética / Variedad</label>
                <select
                  value={form.variedad}
                  onChange={(e) =>
                    setForm({ ...form, variedad: e.target.value })
                  }
                  required
                  className="input-light appearance-none cursor-pointer"
                >
                  <option value="" className="bg-white text-slate-900">
                    Selecciona...
                  </option>
                  {geneticaOptions.map((g) => (
                    <option
                      key={g.id}
                      value={g.id}
                      className="bg-white text-slate-900"
                    >
                      {g.id} ({g.variedad})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Madre Origen - solo para Clon */}
            {tab === "clon" && (
              <div>
                <label className="label-text">Planta Madre Origen</label>
                <select
                  value={form.madre_id}
                  onChange={(e) =>
                    setForm({ ...form, madre_id: e.target.value })
                  }
                  required
                  className="input-light appearance-none cursor-pointer"
                >
                  <option value="" className="bg-white text-slate-900">
                    Selecciona Madre...
                  </option>
                  {(options.madres || []).map((m) => (
                    <option
                      key={m.id}
                      value={m.id}
                      className="bg-white text-slate-900"
                    >
                      {m.id} ({m.variedad})
                    </option>
                  ))}
                </select>
                {selectedMother && (
                  <p className="text-xs font-semibold text-slate-500 mt-2">
                    Genética vinculada: {selectedMother.variedad}
                  </p>
                )}
              </div>
            )}

            {/* Origen ID - para Vegetativo, Floracion, Cosecha */}
            {(tab === "lote" || tab === "floracion" || tab === "cosecha") && (
              <div className="md:col-span-2">
                <label className="label-text">Lote / Planta Origen</label>
                <select
                  value={form.origen_id}
                  onChange={(e) =>
                    setForm({ ...form, origen_id: e.target.value })
                  }
                  required
                  className="input-light appearance-none cursor-pointer"
                >
                  <option value="" className="bg-white text-slate-900">
                    Selecciona Origen...
                  </option>
                  {tab === "lote" &&
                    (options.clones || []).map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        className="bg-white text-slate-900"
                      >
                        {c.id} ({c.variedad})
                      </option>
                    ))}
                  {tab === "floracion" &&
                    (options.vegetativos || []).map((v) => (
                      <option
                        key={typeof v === "string" ? v : v.id}
                        value={typeof v === "string" ? v : v.id}
                      >
                        {typeof v === "string" ? v : v.id}
                      </option>
                    ))}
                  {tab === "cosecha" &&
                    (options.floraciones || []).map((f) => (
                      <option
                        key={typeof f === "string" ? f : f.id}
                        value={typeof f === "string" ? f : f.id}
                      >
                        {typeof f === "string" ? f : f.id}
                      </option>
                    ))}
                </select>
                {selectedOrigin && (
                  <p className="text-xs font-semibold text-slate-500 mt-2">
                    Origen enlazado: {selectedOrigin.id}
                    {selectedOrigin.parentId
                      ? ` -> ${selectedOrigin.parentId}`
                      : ""}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="label-text">
                ID de Trazabilidad (Autogenerado)
              </label>
              <input
                type="text"
                value={form.qr_id}
                readOnly
                placeholder="Autogenerado..."
                className="input-light bg-slate-50 text-slate-500 font-bold cursor-not-allowed border-dashed"
              />
            </div>

            {(tab === "madre" || tab === "clon" || tab === "lote") && (
              <div>
                <label className="label-text">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={form.cantidad}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cantidad: parseInt(e.target.value) || "",
                    })
                  }
                  required
                  className="input-light"
                />
              </div>
            )}

            {tab === "cosecha" && (
              <div>
                <label className="label-text">Peso Húmedo (g)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.peso_humedo}
                  onChange={(e) =>
                    setForm({ ...form, peso_humedo: e.target.value })
                  }
                  required
                  className="input-light"
                />
              </div>
            )}

            {tab !== "clon" && tab !== "genetica" && (
              <div>
                <label className="label-text">Ubicación / Sala</label>
                <input
                  type="text"
                  value={form.ubicacion}
                  onChange={(e) =>
                    setForm({ ...form, ubicacion: e.target.value })
                  }
                  placeholder="Sala Vegetativo A"
                  required
                  className="input-light"
                />
              </div>
            )}

            {tab !== "genetica" && (
              <div>
                <label className="label-text">Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  required
                  className="input-light"
                />
              </div>
            )}

            <div className="flex items-end md:col-span-2">
              <button
                type="submit"
                disabled={loading || !form.qr_id}
                className="btn-glow w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />{" "}
                    Guardando...
                  </>
                ) : (
                  <>
                    REGISTRAR <ChevronRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── SEARCH VIEW ─────────────────────────────────────────

function SearchView({ defaultQuery = "", currentRole = "operario" }) {
  const [query, setQuery] = useState(defaultQuery);
  const [result, setResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [history, setHistory] = useState([]);
  const immediateOrigin = result?.linaje?.[0] || null;
  const finalGeneticsNode =
    result?.node?.type === "genetica"
      ? {
          id: result.node.id,
          type: result.type,
          image:
            result.data?.["Imagen_URL"] ||
            result.data?.["Imagen"] ||
            result.data?.["Imagen_Etiqueta"] ||
            "",
          data: result.data,
        }
      : result?.linaje?.[result.linaje.length - 1] || null;
  const traceRoute = result
    ? [
        {
          id:
            result.node?.id ||
            result.data?.["ID Lote"] ||
            result.data?.["ID Madre"] ||
            result.data?.["ID Clon"] ||
            result.data?.["ID Genética"],
          type: result.type,
        },
        ...(result.linaje || []),
      ]
    : [];

  const editableFields = [
    "Ubicación",
    "Estado",
    "Cantidad",
    "Fecha",
    "Fecha Cosecha",
    "Peso Húmedo (g)",
    "Peso Seco (g)",
    "Notas",
  ].filter((field) => result?.data?.[field] !== undefined);

  // Auto-search if a default query is passed
  useEffect(() => {
    if (defaultQuery) {
      doSearch(defaultQuery);
    }
  }, [defaultQuery]);

  useEffect(() => {
    if (result?.status === "success") {
      const nextForm = {};
      [
        "Ubicación",
        "Estado",
        "Cantidad",
        "Fecha",
        "Fecha Cosecha",
        "Peso Húmedo (g)",
        "Peso Seco (g)",
        "Notas",
      ].forEach((field) => {
        if (result.data?.[field] !== undefined)
          nextForm[field] = result.data[field] || "";
      });
      setEditForm(nextForm);
      setSaveFeedback(null);
    } else {
      setEditForm({});
      setSaveFeedback(null);
    }
  }, [result]);

  const doSearch = async (forceQuery) => {
    const term = forceQuery || query;
    if (!term.trim()) return;

    setSearching(true);
    setQuery(term); // update input field in case of auto-search
    try {
      const res = await axios.get(`/api/search/${encodeURIComponent(term)}`);
      setResult(res.data);
      const historyRes = await axios.get(
        `/api/history/${encodeURIComponent(term)}`,
      );
      setHistory(historyRes.data?.items || []);
    } catch (err) {
      setResult({ status: "error", message: err.message });
      setHistory([]);
    } finally {
      setSearching(false);
    }
  };

  const saveEdit = async () => {
    if (!result?.node?.id) return;
    setSavingEdit(true);
    try {
      const res = await axios.patch(
        `/api/node/${encodeURIComponent(result.node.id)}`,
        {
          data: editForm,
        },
      );
      setSaveFeedback({
        type: "success",
        message:
          res.data?.sync?.pending > 0
            ? "Cambios guardados en local y pendientes de sincronización."
            : "Cambios guardados y sincronizados.",
      });
      await doSearch(result.node.id);
    } catch (err) {
      setSaveFeedback({
        type: "error",
        message: err.response?.data?.message || err.message,
      });
      alert(
        "Error guardando cambios: " +
          (err.response?.data?.message || err.message),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const resolveCurrentConflict = async (mode) => {
    const queueId = result?.node?.syncMeta?.id;
    if (!queueId) return;
    setSavingEdit(true);
    try {
      await axios.post(
        `/api/mirror/queue/${queueId}/${mode === "local" ? "resolve-local" : "resolve-remote"}`,
      );
      await doSearch(result.node.id);
    } catch (err) {
      alert(
        "Error resolviendo conflicto: " +
          (err.response?.data?.message || err.message),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div
      className={cn(
        "max-w-3xl mx-auto text-center space-y-10",
        defaultQuery && "max-w-4xl",
      )}
    >
      <motion.div {...fadeUp} className="space-y-4">
        {!defaultQuery && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 mb-4">
              <Search size={36} className="text-emerald-600" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">
              Visor de Pasaporte
            </h2>
            <p className="text-slate-600 font-semibold">
              Escanea o introduce un código QR para ver su trazabilidad
              completa.
            </p>
          </>
        )}
      </motion.div>

      {!defaultQuery && (
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.2 }}
          className="glass-card p-2 flex items-center gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder="Introduce el ID del lote..."
            className="flex-1 bg-transparent border-none outline-none px-6 py-4 text-slate-900 font-bold placeholder-slate-400 text-lg"
          />
          <button
            onClick={doSearch}
            disabled={searching}
            className="btn-glow shrink-0"
          >
            {searching ? (
              <RefreshCw size={20} className="animate-spin" />
            ) : (
              <>
                <QrCode size={20} /> BUSCAR
              </>
            )}
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "glass-card p-8 text-left",
              result.status === "success"
                ? "border-emerald-200"
                : "border-red-200",
            )}
          >
            {result.status === "success" ? (
              <div className="space-y-8">
                {/* Imagen Hero (si existe en los datos) */}
                {(() => {
                  const rawImg =
                    result.data["Imagen_URL"] ||
                    result.data["Imagen"] ||
                    result.data["Imagen_Etiqueta"];
                  if (!rawImg || typeof rawImg !== "string") return null;

                  let finalImg = rawImg;
                  if (
                    rawImg.includes("drive.google.com") &&
                    !rawImg.includes("thumbnail")
                  ) {
                    const idMatch =
                      rawImg.match(/[?&]id=([^&]+)/) ||
                      rawImg.match(/file\/d\/([^\/]+)/) ||
                      rawImg.match(/id\/([^\/]+)/) ||
                      rawImg.match(/\/d\/([^\/]+)/);
                    const id = idMatch ? idMatch[1] : null;
                    if (id)
                      finalImg = `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
                  }

                  return (
                    <div className="w-full h-64 md:h-80 bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative">
                      <img
                        src={finalImg}
                        alt="Foto Trazabilidad"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            "https://placehold.co/600x400/e2e8f0/64748b?text=Imagen+No+Disponible";
                        }}
                      />
                    </div>
                  );
                })()}

                {/* Cabecera del Lote Escaneado */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-6">
                  <div>
                    <div className="pill bg-emerald-50 text-emerald-700 w-fit mb-3">
                      {result.type}
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {result.data["ID Lote"] ||
                        result.data["ID Madre"] ||
                        result.data["ID Clon"] ||
                        result.data["ID Genética"]}
                    </h3>
                    {result.node?.syncStatus && (
                      <div
                        className={cn(
                          "mt-3 inline-flex px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest",
                          getSyncBadgeClass(result.node.syncStatus),
                        )}
                      >
                        {result.node.syncStatus === "pending_sync"
                          ? "Pendiente de sincronizar"
                          : result.node.syncStatus === "conflict"
                            ? "Conflicto de sincronización"
                            : result.node.syncStatus === "sync_error"
                              ? "Error de sincronización"
                              : "Sincronizado"}
                      </div>
                    )}
                  </div>
                  {result.sheetLink && (
                    <a
                      href={result.sheetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl transition-colors"
                      title="Abrir fila en Google Sheets"
                    >
                      <Database size={14} className="text-emerald-600" /> Ver en
                      Sheets
                    </a>
                  )}
                </div>

                {result.node && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Nodo Actual
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        {result.node.typeLabel}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Pestaña
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        {result.node.sheetName}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Fila Origen
                      </p>
                      <p className="text-sm font-black text-slate-900">
                        {result.node.rowNumber}
                      </p>
                    </div>
                  </div>
                )}

                {result.iot && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                          Contexto IoT de sala
                        </p>
                        <h4 className="text-lg font-black text-slate-900">
                          {result.iot.room}
                        </h4>
                      </div>
                      <span
                        className={cn(
                          "px-3 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest",
                          getIotBadgeClass(result.iot.status),
                        )}
                      >
                        {result.iot.status}
                      </span>
                    </div>

                    {result.iot.activeAlerts?.length > 0 && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-700">
                          Alerta activa de sala
                        </p>
                        <p className="text-sm font-bold text-red-800">
                          {result.iot.activeAlerts[0].alarmCode}
                        </p>
                        <p className="text-sm font-semibold text-red-700">
                          {result.iot.activeAlerts[0].reason || result.iot.summary}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">T</p>
                        <p className="text-sm font-black text-slate-900">{formatMetricValue(result.iot.latest?.ambient?.t, "C")}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">H</p>
                        <p className="text-sm font-black text-slate-900">{formatMetricValue(result.iot.latest?.ambient?.h, "%")}</p>
                      </div>
                      {result.iot.room !== "Almacén Cosecha" && (
                        <>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">VPD</p>
                            <p className="text-sm font-black text-slate-900">{formatMetricValue(result.iot.latest?.ambient?.vpd, "kPa")}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">DLI</p>
                            <p className="text-sm font-black text-slate-900">{formatMetricValue(result.iot.latest?.ambient?.dli, "mol/m2/d")}</p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                        Resumen operativo
                      </p>
                      <p className="text-sm font-bold text-slate-800">
                        {result.iot.summary || "Sin resumen operativo disponible para esta sala."}
                      </p>
                    </div>
                  </div>
                )}

                {result.node && !defaultQuery && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Edicion Local
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {result.node.syncStatus === "synced"
                        ? "Este nodo ya puede entrar en flujo de edicion local-first por API."
                        : "Resuelve la sincronizacion antes de editar este nodo."}
                    </p>
                  </div>
                )}

                {saveFeedback && (
                  <div
                    className={cn(
                      "rounded-2xl border p-4 text-sm font-bold",
                      saveFeedback.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700",
                    )}
                  >
                    {saveFeedback.message}
                  </div>
                )}

                {result.node &&
                  editableFields.length > 0 &&
                  !defaultQuery &&
                  canEditNode(currentRole) && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                            Edicion Local-First
                          </p>
                          <p className="text-sm font-bold text-slate-800">
                            Campos seguros editables sobre la copia local.
                          </p>
                        </div>
                        <button
                          onClick={saveEdit}
                          disabled={
                            savingEdit ||
                            result.node.syncStatus !== "synced" ||
                            !canEditNode(currentRole)
                          }
                          className="btn-glow py-3 px-5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {savingEdit ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" />{" "}
                              Guardando
                            </>
                          ) : (
                            <>
                              <FileCheck size={16} /> Guardar cambios
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {editableFields.map((field) => (
                          <div
                            key={field}
                            className={field === "Notas" ? "md:col-span-2" : ""}
                          >
                            <label className="label-text">{field}</label>
                            {field === "Notas" ? (
                              <textarea
                                value={editForm[field] || ""}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    [field]: e.target.value,
                                  }))
                                }
                                rows={4}
                                className="input-light resize-none"
                                disabled={result.node.syncStatus !== "synced"}
                              />
                            ) : (
                              <input
                                type={
                                  field.includes("Fecha")
                                    ? "date"
                                    : field.includes("Peso") ||
                                        field === "Cantidad"
                                      ? "number"
                                      : "text"
                                }
                                step={field.includes("Peso") ? "0.01" : "1"}
                                value={editForm[field] || ""}
                                onChange={(e) =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    [field]: e.target.value,
                                  }))
                                }
                                className="input-light"
                                disabled={result.node.syncStatus !== "synced"}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {result.node?.syncMeta?.conflict?.localData &&
                  result.node?.syncMeta?.conflict?.remoteData && (
                    <div className="rounded-3xl border border-orange-200 bg-orange-50/60 p-6 space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-700 mb-1">
                          Diferencias del Conflicto
                        </p>
                        <p className="text-sm font-bold text-orange-900">
                          Comparación entre el dato local y el dato existente en
                          Google Sheets.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl bg-white border border-orange-100 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                            Local
                          </p>
                          <div className="space-y-2">
                            {Object.entries(
                              result.node.syncMeta.conflict.localData,
                            ).map(([key, value]) => (
                              <div key={`local-${key}`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  {key}
                                </p>
                                <p className="text-sm font-bold text-slate-800 break-words">
                                  {value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-white border border-orange-100 p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                            Remoto
                          </p>
                          <div className="space-y-2">
                            {Object.entries(
                              result.node.syncMeta.conflict.remoteData,
                            ).map(([key, value]) => (
                              <div key={`remote-${key}`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  {key}
                                </p>
                                <p className="text-sm font-bold text-slate-800 break-words">
                                  {value}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => resolveCurrentConflict("local")}
                          disabled={savingEdit}
                          className="px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-black uppercase tracking-widest disabled:opacity-50"
                        >
                          Mantener local
                        </button>
                        <button
                          onClick={() => resolveCurrentConflict("remote")}
                          disabled={savingEdit}
                          className="px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-black uppercase tracking-widest disabled:opacity-50"
                        >
                          Mantener remoto
                        </button>
                      </div>
                    </div>
                  )}

                {/* Datos del Lote */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {Object.entries(result.data).map(([key, value]) =>
                    value &&
                    key !== "ID Lote" &&
                    key !== "ID Madre" &&
                    key !== "ID Clon" &&
                    key !== "ID Genética" &&
                    key !== "Imagen_URL" &&
                    key !== "Imagen_Etiqueta" &&
                    key !== "Imagen" ? (
                      <div key={key}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                          {key}
                        </p>
                        {String(value).includes("http") ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-bold text-emerald-600 hover:text-emerald-700 underline truncate block"
                          >
                            Ver Enlace
                          </a>
                        ) : (
                          <p className="text-sm font-bold text-slate-800">
                            {value}
                          </p>
                        )}
                      </div>
                    ) : null,
                  )}
                </div>

                {immediateOrigin && (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-2">
                      Origen Inmediato
                    </p>
                    <button
                      onClick={() => {
                        setQuery(immediateOrigin.id);
                        doSearch(immediateOrigin.id);
                      }}
                      className="w-full text-left rounded-2xl bg-white border border-emerald-100 p-4 hover:border-emerald-300 transition-colors"
                    >
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                        {immediateOrigin.type}
                      </p>
                      <p className="text-lg font-black text-slate-900">
                        {immediateOrigin.id}
                      </p>
                    </button>
                  </div>
                )}

                {traceRoute.length > 0 && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                      Ruta Completa
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {traceRoute.map((step, index) => (
                        <button
                          key={`${step.id}-${index}`}
                          onClick={() => {
                            setQuery(step.id);
                            doSearch(step.id);
                          }}
                          className={cn(
                            "px-3 py-2 rounded-xl border text-left transition-colors",
                            index === 0
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-300",
                          )}
                        >
                          <span className="block text-[10px] font-black uppercase tracking-widest opacity-70">
                            {step.type}
                          </span>
                          <span className="block text-sm font-black">
                            {step.id}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {result.node?.type === "madre" && result.node?.parentId && (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-2">
                      Genética Vinculada
                    </p>
                    <button
                      onClick={() => {
                        setQuery(result.node.parentId);
                        doSearch(result.node.parentId);
                      }}
                      className="w-full text-left rounded-2xl bg-white border border-emerald-100 p-4 hover:border-emerald-300 transition-colors"
                    >
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                        Genética Base
                      </p>
                      <p className="text-lg font-black text-slate-900">
                        {result.node.parentId}
                      </p>
                      <p className="text-sm font-semibold text-emerald-700 mt-2">
                        Ver ficha genética completa
                      </p>
                    </button>
                  </div>
                )}

                {defaultQuery &&
                  finalGeneticsNode &&
                  finalGeneticsNode.type
                    ?.toLowerCase()
                    .includes("genética") && (
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">
                          Genética Final
                        </p>
                        <p className="text-lg font-black text-slate-900">
                          {finalGeneticsNode.id}
                        </p>
                      </div>

                      {finalGeneticsNode.image && (
                        <div className="w-full h-56 bg-slate-100 rounded-2xl overflow-hidden border border-emerald-100">
                          <img
                            src={finalGeneticsNode.image}
                            alt={finalGeneticsNode.id}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {finalGeneticsNode.data?.Cannabinoides && (
                          <a
                            href={finalGeneticsNode.data.Cannabinoides}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-2xl bg-white border border-emerald-100 p-4 text-sm font-black text-emerald-700 hover:border-emerald-300"
                          >
                            Ver Cannabinoides
                          </a>
                        )}
                        {finalGeneticsNode.data?.Terpenos && (
                          <a
                            href={finalGeneticsNode.data.Terpenos}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-2xl bg-white border border-emerald-100 p-4 text-sm font-black text-emerald-700 hover:border-emerald-300"
                          >
                            Ver Terpenos
                          </a>
                        )}
                        {finalGeneticsNode.data?.Documentos_URL && (
                          <a
                            href={finalGeneticsNode.data.Documentos_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-2xl bg-white border border-emerald-100 p-4 text-sm font-black text-emerald-700 hover:border-emerald-300"
                          >
                            Ver Documentos
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                {history.length > 0 && !defaultQuery && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                      Historial del Nodo
                    </p>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <p className="text-sm font-black text-slate-900">
                              {getAuditActionLabel(item.action)}
                            </p>
                            <span className="text-xs font-semibold text-slate-500">
                              {new Date(item.timestamp).toLocaleString("es-ES")}
                            </span>
                          </div>
                          {item.payload?.actor && (
                            <p className="text-xs text-emerald-700 font-bold mb-2">
                              Actor: {item.payload.actor.user} · Rol: {getRoleLabel(item.payload.actor.role)}
                            </p>
                          )}
                          {item.payload && (
                            <p className="text-xs text-slate-600 font-semibold break-words">
                              {Object.entries(item.payload)
                                .slice(0, 4)
                                .map(
                                  ([k, v]) =>
                                    `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`,
                                )
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linaje / Árbol de Trazabilidad */}
                {result.linaje && result.linaje.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-slate-100">
                    <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                      <Zap size={18} className="text-amber-500" /> Trazabilidad
                      Completa (Linaje)
                    </h4>
                    <div className="space-y-4">
                      {result.linaje.map((ancestor, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 relative"
                        >
                          {/* Línea conectora */}
                          {i !== result.linaje.length - 1 && (
                            <div className="absolute left-5 top-10 bottom-[-16px] w-0.5 bg-slate-200" />
                          )}
                          <div className="w-10 h-10 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center shrink-0 z-10">
                            <ChevronRight
                              size={16}
                              className="text-slate-400 -rotate-90"
                            />
                          </div>
                          <div
                            className="flex-1 bg-slate-50 rounded-xl p-4 border border-slate-100 cursor-pointer hover:border-emerald-200 transition-colors"
                            onClick={() => {
                              setQuery(ancestor.id);
                              doSearch(ancestor.id);
                            }}
                          >
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">
                              {ancestor.type}
                            </p>
                            <p className="text-sm font-bold text-slate-800">
                              {ancestor.id}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-red-600 font-bold text-center py-4">
                {result.message}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── GENETICS VIEW ───────────────────────────────────────

function GeneticsView({ genetics }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = (genetics || []).filter(
    (g) =>
      g.variedad.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <motion.div
        {...fadeUp}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Dna size={28} className="text-emerald-600" /> Catálogo de Genéticas
            Base
          </h2>
          <p className="text-slate-600 font-semibold mt-1">
            Variedades maestras importadas de Google Sheets.
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Buscar variedad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-light pl-10"
          />
          <Search
            size={18}
            className="text-slate-400 absolute left-4 top-1/2 -translate-y-1/2"
          />
        </div>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filtered.length === 0 ? (
          <div className="col-span-full glass-card p-12 text-center text-slate-500 font-semibold">
            No se encontraron genéticas.
          </div>
        ) : (
          filtered.map((gen, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * i }}
              className="glass-card overflow-hidden flex flex-col hover:border-emerald-200 transition-colors"
            >
              {/* Imagen */}
              <div className="h-48 bg-slate-100 flex items-center justify-center shrink-0 border-b border-slate-200 relative overflow-hidden">
                {gen.imagen_url ? (
                  <img
                    src={(() => {
                      if (!gen.imagen_url.includes("drive.google.com"))
                        return gen.imagen_url;
                      if (gen.imagen_url.includes("thumbnail"))
                        return gen.imagen_url;

                      // Intentar extraer el ID de varios formatos posibles
                      const idMatch =
                        gen.imagen_url.match(/[?&]id=([^&]+)/) ||
                        gen.imagen_url.match(/file\/d\/([^\/]+)/) ||
                        gen.imagen_url.match(/id\/([^\/]+)/) ||
                        gen.imagen_url.match(/\/d\/([^\/]+)/);

                      const id = idMatch ? idMatch[1] : null;
                      return id
                        ? `https://drive.google.com/thumbnail?id=${id}&sz=w1000`
                        : gen.imagen_url;
                    })()}
                    alt={gen.variedad}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://placehold.co/600x400/e2e8f0/64748b?text=Imagen+No+Disponible";
                    }}
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <Leaf size={40} className="mx-auto mb-2 opacity-50" />
                    <span className="text-xs font-bold uppercase tracking-widest">
                      Sin Imagen
                    </span>
                  </div>
                )}
                {/* Etiqueta de ID flotante */}
                <div className="absolute top-4 left-4 pill bg-white/90 backdrop-blur-sm text-slate-900 shadow-sm border border-slate-200">
                  {gen.id}
                </div>
              </div>

              {/* Datos */}
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
                  {gen.variedad}
                </h3>

                <div className="flex flex-wrap gap-2 mb-6">
                  {gen.quimiotipo && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-purple-50 text-purple-700">
                      Quimiotipo: {gen.quimiotipo}
                    </span>
                  )}
                  {gen.linaje && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-blue-50 text-blue-700">
                      Linaje: {gen.linaje}
                    </span>
                  )}
                </div>

                <div className="space-y-3 mt-auto">
                  {gen.cannabinoides && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Cannabinoides
                      </p>
                      {gen.cannabinoides.includes("http") ? (
                        <a
                          href={gen.cannabinoides}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-bold text-emerald-600 hover:text-emerald-700 underline truncate block"
                        >
                          Ver Análisis
                        </a>
                      ) : (
                        <p className="text-sm font-bold text-slate-800">
                          {gen.cannabinoides}
                        </p>
                      )}
                    </div>
                  )}
                  {gen.terpenos && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Terpenos
                      </p>
                      {gen.terpenos.includes("http") ? (
                        <a
                          href={gen.terpenos}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-bold text-emerald-600 hover:text-emerald-700 underline truncate block"
                        >
                          Ver Análisis
                        </a>
                      ) : (
                        <p className="text-sm font-bold text-slate-800">
                          {gen.terpenos}
                        </p>
                      )}
                    </div>
                  )}
                  {gen.notas && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Notas
                      </p>
                      {gen.notas.includes("http") ? (
                        <a
                          href={gen.notas}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline truncate block"
                        >
                          Ver Documento
                        </a>
                      ) : (
                        <p className="text-xs font-semibold text-slate-600 line-clamp-2">
                          {gen.notas}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}

// ─── QR GENERATOR ────────────────────────────────────────

function QRGenerator({ options, apiStatus }) {
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Recopilar todas las entidades con ID
  const allEntities = [
    ...(options.geneticasFull || []).map((g) => ({
      id: g.id,
      variedad: g.variedad,
      type: "Genética Base",
      icon: Dna,
      sheetLink: g.sheetLink,
      parentId: null,
      image: g.imagen_url,
    })),
    ...(options.madres || []).map((m) => ({ ...m, type: "Madre", icon: Leaf })),
    ...(options.clones || []).map((c) => ({
      ...c,
      type: "Clon",
      icon: Sprout,
    })),
    ...(options.vegetativos || []).map((v) => ({
      id: typeof v === "string" ? v : v.id,
      type: "Vegetativo",
      icon: Package,
      sheetLink: typeof v === "string" ? null : v.sheetLink,
    })),
    ...(options.floraciones || []).map((f) => ({
      id: typeof f === "string" ? f : f.id,
      type: "Floración",
      icon: Sun,
      sheetLink: typeof f === "string" ? null : f.sheetLink,
    })),
  ];

  const filteredEntities = allEntities.filter(
    (e) =>
      e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.variedad &&
        e.variedad.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const printQR = () => {
    window.print();
  };

  // El QR SIEMPRE debe apuntar al visor de nuestra app (que ahora lee de la copia espejo),
  // y usar la IP local para que el escaneo desde el móvil dentro del Wi-Fi funcione.
  const isLocalhost =
    typeof window !== "undefined" && window.location.hostname === "localhost";
  const appUrl =
    isLocalhost && apiStatus?.local_ip
      ? `http://${apiStatus.local_ip}:3001`
      : import.meta.env.VITE_PUBLIC_URL ||
        (typeof window !== "undefined"
          ? window.location.origin
          : "https://app.neuro-ia.com");

  const qrUrl = selectedEntity ? `${appUrl}?search=${selectedEntity.id}` : "";

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
      {/* Columna Izquierda: Buscador */}
      <div className="w-full lg:w-1/3 space-y-6 hide-on-print">
        <div className="glass-card p-6">
          <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
            <Search size={18} className="text-emerald-600" /> Buscar Lote
          </h3>
          <input
            type="text"
            placeholder="Ej. PAC-PM-1-26..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-light mb-4"
          />
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            {filteredEntities.length === 0 ? (
              <p className="text-sm text-slate-500 font-semibold text-center py-4">
                No se encontraron lotes.
              </p>
            ) : (
              filteredEntities.map((entity, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedEntity(entity)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                    selectedEntity?.id === entity.id
                      ? "bg-emerald-50 border border-emerald-200"
                      : "hover:bg-slate-50 border border-transparent",
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      selectedEntity?.id === entity.id
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <entity.icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {entity.id}
                    </p>
                    <p className="text-xs text-slate-600 font-semibold">
                      {entity.type}{" "}
                      {entity.variedad ? `(${entity.variedad})` : ""}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Columna Derecha: Vista Previa y QR */}
      <div className="w-full lg:w-2/3">
        {!selectedEntity ? (
          <div className="glass-card p-12 flex flex-col items-center justify-center text-center h-full hide-on-print">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
              <QrCode size={32} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-black text-slate-900">
              Módulo de Etiquetado
            </h3>
            <p className="text-slate-600 font-semibold mt-2">
              Selecciona un lote de la lista para generar e imprimir su etiqueta
              QR.
            </p>
          </div>
        ) : (
          <div className="glass-card p-8 print-no-border">
            <div className="flex justify-between items-start mb-8 hide-on-print">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  Vista Previa de Etiqueta
                </h3>
                <p className="text-sm text-slate-600 font-semibold">
                  Asegúrate de que la impresora térmica esté conectada.
                </p>
              </div>
              <button onClick={printQR} className="btn-glow py-3 px-6 text-sm">
                IMPRIMIR <ChevronRight size={16} />
              </button>
            </div>

            {/* Etiqueta imprimible */}
            <div className="printable-label flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-3xl w-full max-w-sm mx-auto bg-white relative">
              <div className="mb-6">
                <QRCodeCanvas
                  value={qrUrl}
                  size={200}
                  level={"M"}
                  includeMargin={true}
                  bgColor={"#ffffff"}
                  fgColor={"#0f172a"}
                />
              </div>
              <div className="text-center w-full">
                <p className="text-2xl font-black text-slate-900 tracking-tight mb-2 break-all px-2">
                  {selectedEntity.id}
                </p>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-widest rounded-md">
                    {selectedEntity.type}
                  </span>
                </div>
                {selectedEntity.variedad && (
                  <p className="text-lg text-slate-600 font-bold">
                    {selectedEntity.variedad}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                  <span
                    className={cn(
                      "px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest",
                      getSyncBadgeClass(selectedEntity.syncStatus),
                    )}
                  >
                    {selectedEntity.syncStatus === "pending_sync"
                      ? "Pendiente Sync"
                      : selectedEntity.syncStatus === "conflict"
                        ? "Conflicto"
                        : selectedEntity.syncStatus === "sync_error"
                          ? "Error Sync"
                          : "Sincronizado"}
                  </span>
                </div>
                {selectedEntity.parentId && (
                  <p className="text-xs text-slate-500 font-bold mt-2 break-all px-2">
                    Origen: {selectedEntity.parentId}
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-slate-200 w-full flex justify-between items-center px-4">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Neuro-IA
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {new Date().toLocaleDateString("es-ES")}
                  </span>
                </div>
              </div>
            </div>

            <style jsx>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                .printable-label,
                .printable-label * {
                  visibility: visible;
                }
                .printable-label {
                  position: absolute;
                  left: 0;
                  top: 0;
                  border: none;
                  width: 100%;
                  max-width: none;
                  padding: 0;
                }
                .hide-on-print {
                  display: none !important;
                }
                .print-no-border {
                  border: none !important;
                  box-shadow: none !important;
                  background: transparent !important;
                }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}

function AuditView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    const loadAudit = async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/history");
        setItems(res.data?.items || []);
      } catch (error) {
        console.error(error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadAudit();
  }, []);

  const actions = Array.from(new Set(items.map((item) => item.action))).sort();
  const filteredItems = items.filter((item) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      String(item.nodeId || "")
        .toLowerCase()
        .includes(term) ||
      String(item.sheetName || "")
        .toLowerCase()
        .includes(term) ||
      String(item.action || "")
        .toLowerCase()
        .includes(term) ||
      JSON.stringify(item.payload || {})
        .toLowerCase()
        .includes(term);
    const matchesAction =
      actionFilter === "all" || item.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h3 className="text-3xl font-black text-slate-900 tracking-tight">
          Auditoria Global
        </h3>
        <p className="text-slate-600 font-semibold mt-2">
          Historial completo de escaneos, cambios locales, sincronizaciones y
          conflictos.
        </p>
      </div>

      <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-4 items-end">
        <div>
          <label className="label-text">Buscar</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nodo, hoja, acción..."
            className="input-light"
          />
        </div>
        <div>
          <label className="label-text">Acción</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input-light"
          >
            <option value="all">Todas</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {getAuditActionLabel(action)}
              </option>
            ))}
          </select>
        </div>
        <a
          href="/api/history/export"
          className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-black uppercase tracking-widest text-center"
        >
          Exportar
        </a>
      </div>

      <div className="glass-card p-8">
        {loading ? (
          <div className="text-sm font-bold text-slate-500">
            Cargando auditoria...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-sm font-bold text-slate-500">
            No hay eventos registrados.
          </div>
        ) : (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      {getAuditActionLabel(item.action)}
                    </p>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      Nodo: {item.nodeId || "n/d"} · Hoja:{" "}
                      {item.sheetName || "n/d"}
                    </p>
                    {item.payload?.actor && (
                      <p className="text-xs text-emerald-700 font-bold mt-1">
                        Actor: {item.payload.actor.user} · Rol: {getRoleLabel(item.payload.actor.role)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">
                    {new Date(item.timestamp).toLocaleString("es-ES")}
                  </span>
                </div>
                {item.payload && (
                  <div className="text-xs text-slate-600 font-semibold break-words">
                    {Object.entries(item.payload)
                      .slice(0, 6)
                      .map(
                        ([k, v]) =>
                          `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`,
                      )
                      .join(" · ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LaboresView({ currentRole = "operario" }) {
  const today = new Date().toISOString().split("T")[0];
  const [turno, setTurno] = useState("manana");
  const [checked, setChecked] = useState({});
  const bloques = [
    {
      title: "Genética y Madres",
      icon: Dna,
      accent: "bg-emerald-600",
      roles: ["cultivo", "operario", "qa"],
      labores: [
        "Verificar identidad varietal, linaje y documentación técnica.",
        "Revisar vigor, sanidad, estructura y estabilidad de madres.",
        "Inspeccionar plagas, carencias, exceso de riego y daños mecánicos.",
        "Registrar podas, despuntes, limpieza basal y reposición de etiquetas.",
        "Comprobar limpieza de sala, herramientas y trazabilidad de cada madre.",
      ],
    },
    {
      title: "Clonado y Enraizado",
      icon: Sprout,
      accent: "bg-teal-600",
      roles: ["operario", "cultivo"],
      labores: [
        "Seleccionar material vegetal sano y homogéneo para esquejado.",
        "Preparar bandejas, tacos, hormona de enraizado y humedad ambiental.",
        "Controlar temperatura, VPD, riego fino y porcentaje de prendimiento.",
        "Retirar material fallido y registrar merma real del lote.",
        "Confirmar que cada lote de clones mantiene su QR e identificación.",
      ],
    },
    {
      title: "Vegetativo",
      icon: Package,
      accent: "bg-lime-600",
      roles: ["operario", "cultivo"],
      labores: [
        "Verificar trasplante, arraigo, crecimiento uniforme y densidad de plantas.",
        "Ajustar riego, EC, pH, drenaje y frecuencia según desarrollo radicular.",
        "Ejecutar tutorado, poda de formación, LST o limpieza si aplica.",
        "Controlar clima: temperatura, humedad, ventilación y fotoperiodo.",
        "Registrar incidencias de sala, movimientos de lote y cambios de estado.",
      ],
    },
    {
      title: "Floración",
      icon: Sun,
      accent: "bg-amber-500",
      roles: ["operario", "cultivo", "qa"],
      labores: [
        "Confirmar paso correcto desde vegetativo y homogeneidad del lote.",
        "Ajustar clima, nutrición y riego para fase reproductiva.",
        "Controlar altura, estiramiento, tutores, malla y estructura floral.",
        "Inspeccionar botrytis, oídio, plagas y contaminaciones cruzadas.",
        "Registrar cambios fenológicos, mermas, retirada de plantas y observaciones.",
      ],
    },
    {
      title: "Cosecha y Postcosecha",
      icon: Scissors,
      accent: "bg-rose-600",
      roles: ["operario", "cultivo", "qa"],
      labores: [
        "Validar lote correcto antes del corte y confirmar identidad por QR.",
        "Registrar fecha de corte y peso húmedo inmediatamente.",
        "Separar lotes, evitar mezclas y mantener etiquetado durante manipulación.",
        "Anotar peso seco cuando proceda y cualquier desviación del proceso.",
        "Asegurar limpieza de útiles, mesas, contenedores y sala de trabajo.",
      ],
    },
    {
      title: "Calidad, Sync y Sistema",
      icon: FileCheck,
      accent: "bg-sky-600",
      roles: ["qa", "tecnico", "cultivo"],
      labores: [
        "Comprobar que nuevas altas quedan visibles en visor, etiquetado y auditoría.",
        "Revisar cola pendiente, conflictos y último estado del espejo local.",
        "Exportar backup antes de cambios críticos o fin de jornada si aplica.",
        "Validar lectura móvil de QR en muestras representativas del cultivo.",
        "Resolver conflictos antes de cerrar jornada operativa o traspasar turno.",
      ],
    },
  ];

  const storageKey = `labores:${today}:${turno}`;
  const visibleBloques = bloques.filter((bloque) =>
    bloque.roles.includes(currentRole),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      setChecked(raw ? JSON.parse(raw) : {});
    } catch {
      setChecked({});
    }
  }, [storageKey]);

  const toggleLabor = (id) => {
    setChecked((current) => {
      const next = { ...current, [id]: !current[id] };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      }
      return next;
    });
  };

  const totalLabores = visibleBloques.reduce(
    (acc, bloque) => acc + bloque.labores.length,
    0,
  );
  const completedLabores = Object.values(checked).filter(Boolean).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h3 className="text-3xl font-black text-slate-900 tracking-tight">
          Labores de Cultivo
        </h3>
        <p className="text-slate-600 font-semibold mt-2">
          Checklist operativo de las labores principales y necesarias en todas
          las fases del cultivo de cannabis.
        </p>
      </div>

      <div className="glass-card p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <p className="label-text">Fecha operativa</p>
          <div className="input-light bg-slate-50 text-slate-700 font-bold">
            {new Date(today).toLocaleDateString("es-ES")}
          </div>
        </div>
        <div>
          <label className="label-text">Turno</label>
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
            className="input-light"
          >
            <option value="manana">Manana</option>
            <option value="tarde">Tarde</option>
            <option value="noche">Noche</option>
          </select>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">
            Progreso diario
          </p>
          <p className="text-lg font-black text-slate-900">
            {completedLabores}/{totalLabores}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {visibleBloques.map((bloque, index) => {
          const Icon = bloque.icon;
          const completedInBlock = bloque.labores.filter(
            (_, laborIndex) => checked[`${bloque.title}:${laborIndex}`],
          ).length;
          return (
            <motion.div
              key={bloque.title}
              {...fadeUp}
              transition={{ delay: 0.05 * index }}
              className="glass-card p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-white",
                    bloque.accent,
                  )}
                >
                  <Icon size={22} />
                </div>
                <h4 className="text-xl font-black text-slate-900">
                  {bloque.title}
                </h4>
                <div className="ml-auto text-right">
                  <span className="block text-xs font-black uppercase tracking-widest text-slate-500">
                    {completedInBlock}/{bloque.labores.length}
                  </span>
                  <span className="block text-[10px] font-bold text-slate-400 mt-1">
                    Roles:{" "}
                    {bloque.roles
                      .map((role) => roleDefinitions[role]?.label || role)
                      .join(", ")}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {bloque.labores.map((labor, laborIndex) => {
                  const laborId = `${bloque.title}:${laborIndex}`;
                  const isDone = Boolean(checked[laborId]);
                  return (
                    <div
                      key={labor}
                      className={cn(
                        "rounded-2xl border px-4 py-3 flex items-start gap-3 transition-colors",
                        isDone
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-slate-50",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleLabor(laborId)}
                        className={cn(
                          "w-5 h-5 rounded-md border mt-0.5 shrink-0 transition-colors",
                          isDone
                            ? "bg-emerald-600 border-emerald-600"
                            : "bg-white border-slate-300",
                        )}
                        aria-label={`Marcar labor ${labor}`}
                      />
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          isDone
                            ? "text-emerald-800 line-through"
                            : "text-slate-700",
                        )}
                      >
                        {labor}
                      </p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [options, setOptions] = useState({
    variedades: [],
    madres: [],
    clones: [],
    vegetativos: [],
    floraciones: [],
  });
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  );
  const [apiStatus, setApiStatus] = useState(null);
  const [mirrorStatus, setMirrorStatus] = useState(null);
  const [iotRoomStatus, setIotRoomStatus] = useState([]);
  const [iotAlerts, setIotAlerts] = useState([]);
  const [syncingMirror, setSyncingMirror] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [urlSearchTerm, setUrlSearchTerm] = useState(null);
  const [qrStandaloneMode, setQrStandaloneMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("currentUser");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    loadOptions();
    checkHealth();
    loadMirrorStatus();
    loadIotOverview();

    // Verificar si hay un ID en la URL para abrir el buscador directamente (Opción A de QR)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const searchId = params.get("search");
      if (searchId) {
        setUrlSearchTerm(searchId);
        setPage("search");
        setQrStandaloneMode(true);
        if (window.innerWidth < 1024) {
          setSidebarOpen(false);
        }

        // Limpiar la URL para que no interfiera en la navegación posterior
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    }
  }, []);

  const loadOptions = async () => {
    try {
      const r = await axios.get("/api/options");
      if (r.data.status === "success") setOptions(r.data.options);
    } catch (e) {
      console.error(e);
    }
  };

  const checkHealth = async () => {
    try {
      const r = await axios.get("/api/health");
      setApiStatus(r.data);
    } catch {
      setApiStatus({ status: "error" });
    }
  };

  const loadMirrorStatus = async () => {
    try {
      const r = await axios.get("/api/mirror/status");
      if (r.data.status === "success") setMirrorStatus(r.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadIotOverview = async () => {
    try {
      const [rooms, alerts] = await Promise.all([
        Promise.all(
          IOT_ROOMS.map(async (room) => {
            try {
              const response = await axios.get(
                `/api/agents/iot/rooms/${encodeURIComponent(room)}/status`,
              );
              return response.data;
            } catch {
              return {
                room,
                classification: {
                  status: "OFFLINE",
                  reason: "No hay datos IoT disponibles para esta sala.",
                },
                dataQuality: { freshnessSeconds: "N/D" },
                metrics: { ambient: {}, substrate: {}, fertigation: {} },
                lastUpdatedAt: null,
              };
            }
          }),
        ),
        axios.get("/api/agents/emergency/active"),
      ]);
      setIotRoomStatus(rooms);
      setIotAlerts(alerts.data?.items || []);
    } catch (error) {
      console.error(error);
    }
  };

  const syncMirrorNow = async () => {
    setSyncingMirror(true);
    try {
      await axios.post("/api/mirror/sync");
      await Promise.all([checkHealth(), loadMirrorStatus(), loadOptions(), loadIotOverview()]);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingMirror(false);
    }
  };

  const resolveQueueKeepLocal = async (id) => {
    setSyncingMirror(true);
    try {
      await axios.post(`/api/mirror/queue/${id}/resolve-local`);
      await Promise.all([checkHealth(), loadMirrorStatus(), loadOptions(), loadIotOverview()]);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingMirror(false);
    }
  };

  const resolveQueueKeepRemote = async (id) => {
    setSyncingMirror(true);
    try {
      await axios.post(`/api/mirror/queue/${id}/resolve-remote`);
      await Promise.all([checkHealth(), loadMirrorStatus(), loadOptions(), loadIotOverview()]);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingMirror(false);
    }
  };

  const retryQueueItem = async (id) => {
    setSyncingMirror(true);
    try {
      await axios.post(`/api/mirror/queue/${id}/retry`);
      await Promise.all([checkHealth(), loadMirrorStatus(), loadOptions(), loadIotOverview()]);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingMirror(false);
    }
  };

  const discardQueueItem = async (id) => {
    setSyncingMirror(true);
    try {
      await axios.post(`/api/mirror/queue/${id}/discard`);
      await Promise.all([checkHealth(), loadMirrorStatus(), loadOptions(), loadIotOverview()]);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingMirror(false);
    }
  };

  const restoreBackupFile = async (file) => {
    setRestoringBackup(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await axios.post("/api/backup/restore", payload);
      await Promise.all([checkHealth(), loadMirrorStatus(), loadOptions(), loadIotOverview()]);
    } catch (e) {
      console.error(e);
      alert(
        "Error restaurando backup: " + (e.response?.data?.message || e.message),
      );
    } finally {
      setRestoringBackup(false);
    }
  };

  const nav = [
    { id: "dashboard", label: "Ecosistema", icon: TrendingUp },
    { id: "iot", label: "Datos IoT", icon: Database },
    { id: "genetics", label: "Genéticas", icon: Dna },
    { id: "labores", label: "Labores", icon: Activity },
    { id: "admin", label: "Pasaporte", icon: FileCheck },
    { id: "search", label: "Visor QR", icon: Search },
    { id: "qr", label: "Etiquetado", icon: QrCode },
    { id: "audit", label: "Auditoría", icon: Activity },
  ];
  const currentRole = qrStandaloneMode ? "qa" : currentUser?.role || null;
  const visibleNav = nav.filter((item) => canAccessPage(currentRole || "operario", item.id));

  useEffect(() => {
    if (typeof window !== "undefined" && currentUser) {
      window.localStorage.setItem("currentUser", JSON.stringify(currentUser));
    }
    if (currentRole && !canAccessPage(currentRole, page)) {
      setPage("dashboard");
    }
  }, [currentUser, currentRole, page]);

  useEffect(() => {
    if (currentUser) {
      axios.defaults.headers.common["x-user-name"] = currentUser.name;
      axios.defaults.headers.common["x-user-role"] = currentUser.role;
    } else {
      delete axios.defaults.headers.common["x-user-name"];
      delete axios.defaults.headers.common["x-user-role"];
    }
  }, [currentUser]);

  if (!qrStandaloneMode && !currentUser) {
    return (
      <LoginView
        onLogin={(user) => {
          setCurrentUser(user);
          if (typeof window !== "undefined") {
            window.localStorage.setItem("currentUser", JSON.stringify(user));
          }
        }}
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && !qrStandaloneMode && (
        <button
          aria-label="Cerrar menú lateral"
          className="fixed inset-0 z-40 bg-slate-900/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ═══ SIDEBAR ═══ */}
      {!qrStandaloneMode && (
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 h-full flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden shrink-0 lg:relative",
            sidebarOpen
              ? "w-72 p-8 translate-x-0"
              : "w-0 p-0 -translate-x-full lg:translate-x-0",
          )}
          style={{ background: "#ffffff", borderRight: "1px solid #e2e8f0" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-4 mb-14 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <Leaf size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                NEURO-IA
              </h1>
              <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[3px]">
                Trazabilidad
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 space-y-2">
            {visibleNav.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  if (
                    typeof window !== "undefined" &&
                    window.innerWidth < 1024
                  ) {
                    setSidebarOpen(false);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group",
                  page === item.id
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/15"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <item.icon
                  size={20}
                  className={cn(
                    "transition-all",
                    page === item.id
                      ? "text-white"
                      : "text-slate-500 group-hover:text-emerald-600",
                  )}
                />
                <span className="text-xs font-black uppercase tracking-widest">
                  {item.label}
                </span>
              </button>
            ))}
          </nav>

          {/* Status */}
          <div className="shrink-0 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  apiStatus?.status === "ok"
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-red-500",
                )}
              />
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                {apiStatus?.status === "ok" ? "Conectado" : "Offline"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
              <Database size={14} />
              <span>
                {apiStatus?.sheets_connected
                  ? "Google Sheets activo"
                  : "Sin conexión a Sheets"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold mt-2">
              <RefreshCw size={14} />
              <span>
                Espejo: {apiStatus?.mirror?.source || "n/d"}
                {apiStatus?.mirror?.nodes
                  ? ` · ${apiStatus.mirror.nodes} nodos`
                  : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold mt-2">
              <Zap size={14} />
              <span>
                Cola: {apiStatus?.mirror?.pending_ops ?? 0} pendientes
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold mt-2">
              <AlertTriangle size={14} />
              <span>Conflictos: {apiStatus?.mirror?.conflict_ops ?? 0}</span>
            </div>
          </div>
        </aside>
      )}

      {/* ═══ MAIN ═══ */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        {!qrStandaloneMode && (
          <header
            className="sticky top-0 z-40 px-8 py-5 flex items-center justify-between"
            style={{
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(20px)",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <div className="flex items-center gap-6">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {nav.find((n) => n.id === page)?.label || "Dashboard"}
                </h2>
                <p className="text-sm text-slate-600 font-semibold">
                  Neuro-IA Trazabilidad Industrial
                </p>
              </div>
            </div>
          <div className="flex items-center gap-5">
            {!qrStandaloneMode && currentUser && (
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-700">
                  {currentUser.name}
                </span>
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600">
                  {roleDefinitions[currentUser.role]?.label || currentUser.role}
                </span>
              </div>
            )}
            <span className="text-sm text-slate-600 font-bold hidden md:block">
              Javier Ferrández
            </span>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white text-sm font-black shadow-lg">
              JF
            </div>
            {!qrStandaloneMode && currentUser && (
              <button
                onClick={() => {
                  setCurrentUser(null);
                  if (typeof window !== "undefined") {
                    window.localStorage.removeItem("currentUser");
                  }
                }}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest"
              >
                Salir
              </button>
            )}
          </div>
        </header>
        )}

        {/* Page Content */}
        <div className={cn("p-8 md:p-12", qrStandaloneMode && "p-4 md:p-6")}>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              {...fadeUp}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {page === "dashboard" && (
                <Dashboard
                  options={options}
                  apiStatus={apiStatus}
                  mirrorStatus={mirrorStatus}
                  onSync={syncMirrorNow}
                  onRetry={retryQueueItem}
                  onDiscard={discardQueueItem}
                  onResolveLocal={resolveQueueKeepLocal}
                  onResolveRemote={resolveQueueKeepRemote}
                  onRestoreBackup={restoreBackupFile}
                  syncing={syncingMirror}
                  restoring={restoringBackup}
                  currentRole={currentRole}
                />
              )}
              {page === "iot" && (
                <IotDataView
                  apiStatus={apiStatus}
                  iotRooms={iotRoomStatus}
                  iotAlerts={iotAlerts}
                />
              )}
              {page === "genetics" && (
                <GeneticsView genetics={options.geneticasFull} />
              )}
              {page === "labores" && <LaboresView currentRole={currentRole} />}
              {page === "admin" && (
                <AdminPanel options={options} onRefresh={loadOptions} />
              )}
              {page === "search" && (
                <SearchView
                  defaultQuery={urlSearchTerm || ""}
                  currentRole={currentRole}
                />
              )}
              {page === "qr" && (
                <QRGenerator options={options} apiStatus={apiStatus} />
              )}
              {page === "audit" && <AuditView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
