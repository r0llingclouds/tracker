const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Format a Date as a local date string YYYY-MM-DD.
 * This is stable for personal daily tracking and avoids timezone surprises on import/export.
 */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${pad2(m)}-${pad2(day)}`;
}

export function parseLocalDateString(ymd: string): Date | null {
  // Expect YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const d = new Date(year, month - 1, day);
  // Validate roundtrip (catches 2026-02-31 etc.)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

export function startOfWeekSunday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = copy.getDay(); // 0=Sun
  copy.setDate(copy.getDate() - dow);
  return copy;
}

export function endOfWeekSaturday(d: Date): Date {
  const start = startOfWeekSunday(d);
  start.setDate(start.getDate() + 6);
  return start;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function subWeeks(d: Date, weeks: number): Date {
  return addDays(d, -7 * weeks);
}

export function eachDayInclusive(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= last) {
    out.push(new Date(cur.getFullYear(), cur.getMonth(), cur.getDate()));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
