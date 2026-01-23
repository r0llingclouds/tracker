import type { Habit } from "./schema";

export type HabitBreakdown = {
  habitId: string;
  habitName: string;
  kind: Habit["kind"];
  value: number;
  target?: number;
  progress01: number; // 0..1
};

export type DayScore = {
  score01: number; // 0..1
  level: 0 | 1 | 2 | 3 | 4;
  activeHabitCount: number;
  breakdown: HabitBreakdown[];
};

export function computeHabitProgress01(habit: Habit, value: number | undefined): number {
  const v = typeof value === "number" && Number.isFinite(value) ? value : 0;
  if (habit.kind === "checkbox") return v >= 1 ? 1 : 0;

  const target = typeof habit.target === "number" && Number.isFinite(habit.target) ? habit.target : undefined;
  if (!target || target <= 0) return v > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, v / target));
}

export function scoreToLevel(score01: number): 0 | 1 | 2 | 3 | 4 {
  const s = Math.max(0, Math.min(1, score01));
  if (s === 0) return 0;
  if (s < 0.25) return 1;
  if (s < 0.5) return 2;
  if (s < 0.75) return 3;
  return 4;
}

export function computeDayScore(habits: Habit[], values: Record<string, number> | undefined): DayScore {
  const active = habits.filter((h) => !h.archivedAt);
  const breakdown: HabitBreakdown[] = active.map((h) => {
    const value = values?.[h.id] ?? 0;
    const progress01 = computeHabitProgress01(h, value);
    return {
      habitId: h.id,
      habitName: h.name,
      kind: h.kind,
      value,
      target: h.kind === "count" ? h.target : undefined,
      progress01,
    };
  });

  if (active.length === 0) {
    return { score01: 0, level: 0, activeHabitCount: 0, breakdown: [] };
  }

  const score01 = breakdown.reduce((sum, b) => sum + b.progress01, 0) / active.length;
  return {
    score01,
    level: scoreToLevel(score01),
    activeHabitCount: active.length,
    breakdown,
  };
}
