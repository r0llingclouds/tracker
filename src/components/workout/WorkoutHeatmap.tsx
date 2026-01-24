import { useEffect, useMemo, useRef, useState } from "react";

type ColorScheme = "amber" | "rose";

interface WorkoutHeatmapProps {
  data: Record<string, number>;  // date -> value
  title: string;
  subtitle: string;
  unit: string;
  colorScheme: ColorScheme;
  thresholds: [number, number, number, number];  // [level1, level2, level3, level4]
}

type HoverState = {
  date: string;
  x: number;
  y: number;
  value: number;
} | null;

const WEEKDAY_LABELS: Array<{ row: number; label: string }> = [
  { row: 1, label: "Mon" },
  { row: 3, label: "Wed" },
  { row: 5, label: "Fri" },
];

function getLevel(value: number, thresholds: [number, number, number, number]): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0) return 0;
  if (value < thresholds[0]) return 1;
  if (value < thresholds[1]) return 2;
  if (value < thresholds[2]) return 3;
  return 4;
}

function levelClass(level: 0 | 1 | 2 | 3 | 4, colorScheme: ColorScheme): string {
  if (colorScheme === "amber") {
    switch (level) {
      case 0: return "bg-zinc-200 dark:bg-zinc-800";
      case 1: return "bg-amber-200 dark:bg-amber-950";
      case 2: return "bg-amber-300 dark:bg-amber-900";
      case 3: return "bg-amber-500 dark:bg-amber-700";
      case 4: return "bg-amber-700 dark:bg-amber-500";
    }
  } else {
    switch (level) {
      case 0: return "bg-zinc-200 dark:bg-zinc-800";
      case 1: return "bg-rose-200 dark:bg-rose-950";
      case 2: return "bg-rose-300 dark:bg-rose-900";
      case 3: return "bg-rose-500 dark:bg-rose-700";
      case 4: return "bg-rose-700 dark:bg-rose-500";
    }
  }
}

function monthShort(d: Date): string {
  return d.toLocaleString(undefined, { month: "short" });
}

function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfWeekSunday(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  return result;
}

function endOfWeekSaturday(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  result.setDate(result.getDate() + (6 - day));
  return result;
}

function subWeeks(d: Date, weeks: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() - weeks * 7);
  return result;
}

export function WorkoutHeatmap({ data, title, subtitle, unit, colorScheme, thresholds }: WorkoutHeatmapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hover, setHover] = useState<HoverState>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setContainerWidth(el.clientWidth);
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  const formatValue = (value: number): string => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  };

  return (
    <section
      ref={containerRef}
      className="relative rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="mb-4 flex flex-col gap-1">
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{title}</div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">{subtitle}</div>
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
                    const value = data[date] || 0;
                    const level = getLevel(value, thresholds);

                    return (
                      <button
                        key={date}
                        type="button"
                        className={[
                          "h-3 w-3 rounded-[3px] border border-black/5 dark:border-white/5",
                          levelClass(level, colorScheme),
                        ].join(" ")}
                        aria-label={`${date}: ${formatValue(value)} ${unit}`}
                        onMouseEnter={(e) => {
                          const rect = containerRef.current?.getBoundingClientRect();
                          if (!rect) return;
                          setHover({
                            date,
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top,
                            value,
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
                              : prev
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

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-2 text-xs text-zinc-600 dark:text-zinc-400">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={[
              "h-3 w-3 rounded-[3px] border border-black/5 dark:border-white/5",
              levelClass(level as 0 | 1 | 2 | 3 | 4, colorScheme),
            ].join(" ")}
          />
        ))}
        <span>More</span>
      </div>

      {hover ? (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
          style={{
            left: Math.min(hover.x + 12, containerWidth - 150),
            top: Math.max(hover.y - 12, 12),
          }}
        >
          <div className="font-medium text-zinc-900 dark:text-zinc-50">{hover.date}</div>
          <div className="text-zinc-600 dark:text-zinc-300">
            {formatValue(hover.value)} {unit}
          </div>
        </div>
      ) : null}
    </section>
  );
}
