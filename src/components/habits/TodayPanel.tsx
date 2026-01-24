import { useState } from "react";
import type { TrackerDoc } from "../../lib/habits/schema";
import { AddHabitDialog } from "./AddHabitDialog";
import { HabitList } from "./HabitList";

type Props = {
  doc: TrackerDoc;
  setDoc: (next: TrackerDoc) => void;
  today: string; // YYYY-MM-DD
};

export function TodayPanel({ doc, setDoc, today }: Props) {
  const [isOrdering, setIsOrdering] = useState(false);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Today</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400">{today}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            onClick={() => setIsOrdering((v) => !v)}
            aria-pressed={isOrdering}
            title={isOrdering ? "Exit ordering mode" : "Reorder habits"}
          >
            {isOrdering ? "Done" : "Order"}
          </button>
          <AddHabitDialog doc={doc} setDoc={setDoc} />
        </div>
      </div>

      <HabitList doc={doc} setDoc={setDoc} today={today} ordering={isOrdering} />
    </section>
  );
}
