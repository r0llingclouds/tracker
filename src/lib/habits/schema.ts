export const SCHEMA_VERSION = 1 as const;

export type HabitKind = "checkbox" | "count";

export type HabitPreset = "kettlebell_swings";

export type Habit = {
  id: string;
  name: string;
  kind: HabitKind;
  createdAt: string; // ISO timestamp
  archivedAt?: string | null; // ISO timestamp
  /**
   * Optional identifier for built-in templates (e.g. kettlebell swings).
   * Used to drive specialized UI without relying on the habit name.
   */
  preset?: HabitPreset;
  /**
   * Used for kind === "count".
   * If present, scoring uses min(value/target, 1).
   */
  target?: number;
  /**
   * Optional weight for presets like kettlebells (in kilograms).
   * This does not currently affect scoring; it's just stored metadata.
   */
  weightKg?: number;
};

export type DayEntry = {
  /**
   * Local date string (stable for personal tracking): YYYY-MM-DD
   */
  date: string;
  /**
   * All habit values are numeric:
   * - checkbox: 0 | 1
   * - count: 0..N
   */
  values: Record<string, number>;
};

export type TrackerDocV1 = {
  schemaVersion: 1;
  exportedAt: string; // ISO timestamp
  /**
   * Display order is the array order. Reordering habits updates this array,
   * and that order is preserved in exported/imported JSON.
   */
  habits: Habit[];
  days: DayEntry[];
};

export type TrackerDoc = TrackerDocV1;
