import { useMemo, useState } from "react";
import type { HabitKind, TrackerDoc } from "../../lib/habits/schema";
import { generateId } from "../../lib/habits/doc";

type Props = {
  doc: TrackerDoc;
  setDoc: (next: TrackerDoc) => void;
};

export function AddHabitDialog({ doc, setDoc }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<HabitKind>("checkbox");
  const [target, setTarget] = useState<string>("100");

  const canSubmit = useMemo(() => name.trim().length > 0, [name]);

  return (
    <>
      <button
        type="button"
        className="rounded-full bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
        onClick={() => setOpen(true)}
      >
        Add habit
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-gray-900 dark:text-gray-100">New habit</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Checkbox or count (e.g. kettlebell swings).
                </div>
              </div>
              <button
                type="button"
                className="rounded-full px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!canSubmit) return;
                const now = new Date().toISOString();
                const trimmed = name.trim();
                const habit = {
                  id: generateId(),
                  name: trimmed,
                  kind,
                  createdAt: now,
                  ...(kind === "count"
                    ? {
                        target: (() => {
                          const n = Number(target);
                          return Number.isFinite(n) && n > 0 ? n : undefined;
                        })(),
                      }
                    : {}),
                };
                setDoc({ ...doc, habits: [...doc.habits, habit] });
                setName("");
                setKind("checkbox");
                setTarget("100");
                setOpen(false);
              }}
            >
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Name</span>
                <input
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-gray-600 dark:text-gray-100"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  placeholder="e.g. Read, Walk, Swings"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Type</span>
                  <select
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-gray-600 dark:text-gray-100"
                    value={kind}
                    onChange={(e) => setKind(e.target.value as HabitKind)}
                  >
                    <option value="checkbox">Checkbox</option>
                    <option value="count">Count</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Target (optional)
                  </span>
                  <input
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-gray-400 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-gray-600 dark:text-gray-100"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    disabled={kind !== "count"}
                    inputMode="numeric"
                    placeholder="e.g. 100"
                  />
                </label>
              </div>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-full bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-gray-800 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
