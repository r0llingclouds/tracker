import type { Habit, TrackerDoc } from "../../lib/habits/schema";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Props = {
  doc: TrackerDoc;
  setDoc: (next: TrackerDoc) => void;
  today: string; // YYYY-MM-DD
  ordering?: boolean;
};

function getOrCreateDayIndex(doc: TrackerDoc, date: string): { nextDoc: TrackerDoc; dayIndex: number } {
  const idx = doc.days.findIndex((d) => d.date === date);
  if (idx >= 0) return { nextDoc: doc, dayIndex: idx };
  const next = { ...doc, days: [...doc.days, { date, values: {} }] };
  return { nextDoc: next, dayIndex: next.days.length - 1 };
}

function setDayValue(doc: TrackerDoc, date: string, habitId: string, value: number): TrackerDoc {
  const { nextDoc, dayIndex } = getOrCreateDayIndex(doc, date);
  const day = nextDoc.days[dayIndex];
  const nextDay = { ...day, values: { ...day.values, [habitId]: value } };
  const days = nextDoc.days.slice();
  days[dayIndex] = nextDay;
  return { ...nextDoc, days };
}

function setHabitWeightKg(doc: TrackerDoc, habitId: string, weightKg: number | undefined): TrackerDoc {
  return {
    ...doc,
    habits: doc.habits.map((h) => (h.id === habitId ? { ...h, weightKg } : h)),
  };
}

function archiveHabit(doc: TrackerDoc, habitId: string): TrackerDoc {
  const now = new Date().toISOString();
  return {
    ...doc,
    habits: doc.habits.map((h) => (h.id === habitId ? { ...h, archivedAt: now } : h)),
  };
}

function activeHabits(doc: TrackerDoc): Habit[] {
  return doc.habits.filter((h) => !h.archivedAt);
}

function reorderActiveHabits(doc: TrackerDoc, orderedActiveIds: string[]): TrackerDoc {
  const active = doc.habits.filter((h) => !h.archivedAt);
  if (active.length === 0) return doc;
  if (orderedActiveIds.length !== active.length) return doc;

  const byId = new Map(active.map((h) => [h.id, h] as const));
  const orderedActiveHabits: Habit[] = [];
  for (const id of orderedActiveIds) {
    const h = byId.get(id);
    if (!h) return doc;
    orderedActiveHabits.push(h);
  }

  let i = 0;
  const habits = doc.habits.map((h) => (h.archivedAt ? h : orderedActiveHabits[i++]));
  return { ...doc, habits };
}

function GrabHandleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4">
      <path
        d="M3 5.5h14M3 10h14M3 14.5h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SortableHabitRow({
  habit,
  doc,
  setDoc,
  today,
  value,
  isDone,
  isKettlebellSwings,
  showHandle,
}: {
  habit: Habit;
  doc: TrackerDoc;
  setDoc: (next: TrackerDoc) => void;
  today: string;
  value: number;
  isDone: boolean;
  isKettlebellSwings: boolean;
  showHandle: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id });
  const style = { transform: CSS.Transform.toString(transform), transition } as const;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "flex flex-col gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between",
        isDragging ? "bg-gray-50 shadow-sm dark:bg-gray-900" : "",
      ].join(" ")}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {showHandle ? (
          <button
            type="button"
            className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
            aria-label={`Reorder "${habit.name}"`}
            title="Drag to reorder"
            {...attributes}
            {...listeners}
          >
            <GrabHandleIcon />
          </button>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{habit.name}</div>
            {habit.kind === "count" && typeof habit.target === "number" ? (
              <div className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                target {habit.target}
              </div>
            ) : null}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {habit.kind === "checkbox" ? (isDone ? "Done" : "Not done yet") : "Count"}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {habit.kind === "checkbox" ? (
          <label className="inline-flex cursor-pointer select-none items-center">
            <input
              type="checkbox"
              className="sr-only peer"
              role="switch"
              checked={isDone}
              onChange={(e) => setDoc(setDayValue(doc, today, habit.id, e.target.checked ? 1 : 0))}
              aria-label={`Mark "${habit.name}" as done`}
            />
            <span
              className={[
                "relative inline-flex h-7 w-12 items-center rounded-full border transition-colors",
                "border-gray-200 bg-gray-100 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gray-400",
                "dark:border-gray-700 dark:bg-gray-800 dark:peer-focus-visible:outline-gray-600",
                "peer-checked:border-green-600 peer-checked:bg-green-600 dark:peer-checked:border-green-600 dark:peer-checked:bg-green-600",
                "after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform",
                "after:translate-x-0 peer-checked:after:translate-x-5",
              ].join(" ")}
            >
            </span>
          </label>
        ) : (
          <>
            <input
              className={[
                isKettlebellSwings ? "w-16 px-2 tabular-nums" : "w-28 px-3",
                "rounded-xl border border-gray-200 bg-white py-1.5 text-sm outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-gray-600 dark:text-gray-100",
              ].join(" ")}
              value={String(value)}
              inputMode="numeric"
              onChange={(e) => {
                const n = Number(e.target.value);
                setDoc(setDayValue(doc, today, habit.id, Number.isFinite(n) ? n : 0));
              }}
            />
            {isKettlebellSwings ? (
              <div className="flex items-center gap-1">
                <input
                  className="w-14 rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-sm tabular-nums outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-gray-600 dark:text-gray-100"
                  value={typeof habit.weightKg === "number" ? String(habit.weightKg) : ""}
                  inputMode="decimal"
                  placeholder="kg"
                  aria-label={`Set weight (kg) for "${habit.name}"`}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    if (raw.length === 0) {
                      setDoc(setHabitWeightKg(doc, habit.id, undefined));
                      return;
                    }
                    const n = Number(raw);
                    setDoc(setHabitWeightKg(doc, habit.id, Number.isFinite(n) && n > 0 ? n : undefined));
                  }}
                />
                <div className="text-xs text-gray-600 dark:text-gray-300">kg</div>
              </div>
            ) : (
              <button
                type="button"
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100"
                onClick={() => setDoc(setDayValue(doc, today, habit.id, value + 10))}
              >
                +10
              </button>
            )}
            <button
              type="button"
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100"
              onClick={() => setDoc(setDayValue(doc, today, habit.id, 0))}
            >
              Clear
            </button>
          </>
        )}

        <button
          type="button"
          className="rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          onClick={() => {
            if (confirm(`Archive habit "${habit.name}"?`)) setDoc(archiveHabit(doc, habit.id));
          }}
        >
          Archive
        </button>
      </div>
    </div>
  );
}

export function HabitList({ doc, setDoc, today, ordering = false }: Props) {
  const habits = activeHabits(doc);
  const day = doc.days.find((d) => d.date === today);
  const habitIds = habits.map((h) => h.id);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  if (habits.length === 0) {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-400">
        No active habits yet. Add one above.
      </div>
    );
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const oldIndex = habitIds.indexOf(activeId);
    const newIndex = habitIds.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextIds = arrayMove(habitIds, oldIndex, newIndex);
    setDoc(reorderActiveHabits(doc, nextIds));
  }

  if (ordering) {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-xs text-gray-600 dark:text-gray-400">Drag the handles to reorder.</div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={habitIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {habits.map((h) => {
                const value = day?.values[h.id] ?? 0;
                const isDone = h.kind === "checkbox" ? value >= 1 : value > 0;
                const isKettlebellSwings = h.preset === "kettlebell_swings" || h.name === "Kettlebell swings";

                return (
                  <SortableHabitRow
                    key={h.id}
                    habit={h}
                    doc={doc}
                    setDoc={setDoc}
                    today={today}
                    value={value}
                    isDone={isDone}
                    isKettlebellSwings={isKettlebellSwings}
                    showHandle
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {habits.map((h) => {
        const value = day?.values[h.id] ?? 0;
        const isDone = h.kind === "checkbox" ? value >= 1 : value > 0;
        const isKettlebellSwings = h.preset === "kettlebell_swings" || h.name === "Kettlebell swings";

        return (
          <SortableHabitRow
            key={h.id}
            habit={h}
            doc={doc}
            setDoc={setDoc}
            today={today}
            value={value}
            isDone={isDone}
            isKettlebellSwings={isKettlebellSwings}
            showHandle={false}
          />
        );
      })}
    </div>
  );
}
