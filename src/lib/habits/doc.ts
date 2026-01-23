import { SCHEMA_VERSION, type Habit, type HabitPreset, type TrackerDoc, type TrackerDocV1 } from "./schema";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isIsoString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isHabit(v: unknown): v is Habit {
  if (!isRecord(v)) return false;
  if (typeof v.id !== "string" || v.id.length === 0) return false;
  if (typeof v.name !== "string" || v.name.length === 0) return false;
  if (v.kind !== "checkbox" && v.kind !== "count") return false;
  if (!isIsoString(v.createdAt)) return false;
  if (v.archivedAt !== undefined && v.archivedAt !== null && !isIsoString(v.archivedAt)) return false;
  if (
    v.preset !== undefined &&
    v.preset !== null &&
    v.preset !== ("kettlebell_swings" satisfies HabitPreset)
  )
    return false;
  if (v.target !== undefined && v.target !== null && !isFiniteNumber(v.target)) return false;
  if (v.weightKg !== undefined && v.weightKg !== null && !isFiniteNumber(v.weightKg)) return false;
  return true;
}

function isTrackerDocV1(v: unknown): v is TrackerDocV1 {
  if (!isRecord(v)) return false;
  if (v.schemaVersion !== 1) return false;
  if (!isIsoString(v.exportedAt)) return false;
  if (!Array.isArray(v.habits) || !v.habits.every(isHabit)) return false;
  if (!Array.isArray(v.days)) return false;
  for (const d of v.days) {
    if (!isRecord(d)) return false;
    if (typeof d.date !== "string" || d.date.length !== 10) return false;
    if (!isRecord(d.values)) return false;
    for (const val of Object.values(d.values)) {
      if (!isFiniteNumber(val)) return false;
    }
  }
  return true;
}

export function parseDoc(doc: unknown): TrackerDoc {
  if (isTrackerDocV1(doc)) return doc;
  throw new Error("Invalid document (unsupported schema).");
}

export function generateId(): string {
  // browser + node (>=19) supports this; fallback is fine for personal use
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function createDefaultDoc(now = new Date()): TrackerDocV1 {
  const createdAt = now.toISOString();
  const kb: Habit = {
    id: generateId(),
    name: "Kettlebell swings",
    kind: "count",
    preset: "kettlebell_swings",
    createdAt,
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: createdAt,
    habits: [kb],
    days: [],
  };
}

export function migrateToLatest(doc: unknown): TrackerDoc {
  // Future: handle schemaVersion 0 -> 1, etc.
  if (isTrackerDocV1(doc)) {
    // Normalize the built-in sample habit: no default target + ensure preset exists.
    let changed = false;
    const habits = doc.habits.map((h) => {
      const isKbByName = h.name === "Kettlebell swings" && h.kind === "count";
      if (!isKbByName) return h;

      const next = { ...h };
      if (next.preset !== "kettlebell_swings") {
        next.preset = "kettlebell_swings";
        changed = true;
      }
      if (next.target === 100) {
        delete next.target;
        changed = true;
      }
      return next;
    });
    return changed ? { ...doc, habits } : doc;
  }
  return createDefaultDoc();
}

export function exportDoc(doc: TrackerDoc): string {
  const exported: TrackerDoc = { ...doc, exportedAt: new Date().toISOString() };
  return JSON.stringify(exported, null, 2);
}

export function importDocFromJson(jsonText: string): TrackerDoc {
  const parsed = JSON.parse(jsonText) as unknown;
  // For user-initiated import, be strict so we don't accidentally wipe data.
  return parseDoc(parsed);
}
