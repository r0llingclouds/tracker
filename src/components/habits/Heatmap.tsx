import { useEffect, useMemo, useRef, useState } from "react";
import type { TrackerDoc } from "../../lib/habits/schema";
import { addDays, endOfWeekSaturday, startOfWeekSunday, subWeeks, toLocalDateString } from "../../lib/habits/dates";
import { computeDayScore } from "../../lib/habits/scoring";

type Props = {
  doc: TrackerDoc;
};

type HoverState =
  | {
      date: string;
      x: number;
      y: number;
      title: string;
      detailLines: string[];
    }
  | null;

const WEEKDAY_LABELS: Array<{ row: number; label: string }> = [
  { row: 1, label: "Mon" },
  { row: 3, label: "Wed" },
  { row: 5, label: "Fri" },
];

function levelClass(level: 0 | 1 | 2 | 3 | 4): string {
  switch (level) {
    case 0:
      return "bg-zinc-200 dark:bg-zinc-800";
    case 1:
      return "bg-green-200 dark:bg-green-950";
    case 2:
      return "bg-green-300 dark:bg-green-900";
    case 3:
      return "bg-green-500 dark:bg-green-700";
    case 4:
      return "bg-green-700 dark:bg-green-500";
  }
}

function monthShort(d: Date): string {
  return d.toLocaleString(undefined, { month: "short" });
}

export function Heatmap({ doc }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hover, setHover] = useState<HoverState>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setContainerWidth(el.clientWidth);
    update();

    // Keep width in sync for tooltip positioning.
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dayMap = useMemo(() => {
    const m = new Map<string, Record<string, number>>();
    for (const d of doc.days) m.set(d.date, d.values);
    return m;
  }, [doc.days]);

  const habitMap = useMemo(() => {
    const m = new Map<string, TrackerDoc["habits"][number]>();
    for (const h of doc.habits) m.set(h.id, h);
    return m;
  }, [doc.habits]);

  const weeks = useMemo(() => {
    const today = new Date();
    const rangeEnd = endOfWeekSaturday(today);
    const rangeStart = startOfWeekSunday(subWeeks(rangeEnd, 52));

    const out: Array<{ weekStart: Date; days: Date[] }> = [];
    let cur = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    while (cur <= rangeEnd) {
      const weekStart = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());
      const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      out.push({ weekStart, days });
      cur = addDays(weekStart, 7);
    }
    return out;
  }, []);

  const monthLabels = useMemo(() => {
    const labels: string[] = [];
    let lastMonth = -1;
    for (const w of weeks) {
      const m = w.weekStart.getMonth();
      if (m !== lastMonth) {
        labels.push(monthShort(w.weekStart));
        lastMonth = m;
      } else {
        labels.push("");
      }
    }
    return labels;
  }, [weeks]);

  return (
    <section
      ref={containerRef}
      className="relative rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="mb-4 flex flex-col gap-1">
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Heatmap</div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          Overall daily score across active habits (last 52 weeks).
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        <div className="w-10 shrink-0 pt-6">
          <div className="relative h-[94px]">
            {WEEKDAY_LABELS.map((w) => (
              <div
                key={w.label}
                className="absolute left-0 text-[10px] text-zinc-600 dark:text-zinc-400"
                style={{ top: `${w.row * 14}px` }}
              >
                {w.label}
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-max">
          <div className="mb-2 flex gap-1">
            {monthLabels.map((label, idx) => (
              <div key={idx} className="w-3 text-[10px] text-zinc-600 dark:text-zinc-400">
                {label}
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {weeks.map((w) => {
              const weekKey = toLocalDateString(w.weekStart);
              return (
                <div key={weekKey} className="flex flex-col gap-1">
                  {w.days.map((d) => {
                    const date = toLocalDateString(d);
                    const values = dayMap.get(date);
                    const score = computeDayScore(doc.habits, values);
                    const pct = Math.round(score.score01 * 100);

                    const detailLines =
                      score.breakdown.length === 0
                        ? ["No active habits"]
                        : score.breakdown.map((b) => {
                            const habit = habitMap.get(b.habitId);
                            const weightKg =
                              habit && typeof habit.weightKg === "number" && Number.isFinite(habit.weightKg) && habit.weightKg > 0
                                ? habit.weightKg
                                : undefined;
                            const isKb = habit?.preset === "kettlebell_swings";

                            if (b.kind === "checkbox") {
                              return `${b.habitName}: ${b.progress01 >= 1 ? "done" : "not done"}`;
                            }

                            // Kettlebell swings: show "reps / weight kg" when weight is set.
                            if (isKb && typeof weightKg === "number") {
                              return `${b.habitName}: ${b.value} / ${weightKg} kg`;
                            }

                            if (typeof b.target === "number") return `${b.habitName}: ${b.value}/${b.target}`;
                            return `${b.habitName}: ${b.value}`;
                          });

                    const title = `${date} • ${pct}%`;

                    return (
                      <button
                        key={date}
                        type="button"
                        className={[
                          "h-3 w-3 rounded-[3px] border border-black/5 dark:border-white/5",
                          levelClass(score.level),
                        ].join(" ")}
                        aria-label={title}
                        onMouseEnter={(e) => {
                          const rect = containerRef.current?.getBoundingClientRect();
                          if (!rect) return;
                          setHover({
                            date,
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                            title,
                            detailLines,
                          });
                        }}
                        onMouseMove={(e) => {
                          const rect = containerRef.current?.getBoundingClientRect();
                          if (!rect) return;
                          setHover((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  x: e.clientX - rect.left,
                                  y: e.clientY - rect.top,
                                }
                              : prev,
                          );
                        }}
                        onMouseLeave={() => setHover(null)}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {hover ? (
        <div
          className="pointer-events-none absolute z-10 w-64 rounded-xl border border-gray-200 bg-white p-3 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-800"
          style={{
            left: Math.min(hover.x + 12, containerWidth - 260),
            top: Math.max(hover.y - 12, 12),
          }}
        >
          <div className="mb-2 font-medium">{hover.title}</div>
          <div className="flex flex-col gap-1 text-zinc-600 dark:text-zinc-300">
            {hover.detailLines.slice(0, 8).map((l) => (
              <div key={l} className="truncate">
                {l}
              </div>
            ))}
            {hover.detailLines.length > 8 ? (
              <div className="text-zinc-600 dark:text-zinc-400">…</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
