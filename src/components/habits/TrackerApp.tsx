import { useEffect, useRef, useState } from "react";
import type { TrackerDoc } from "../../lib/habits/schema";
import { createDefaultDoc, exportDoc, importDocFromJson } from "../../lib/habits/doc";
import { loadDoc, saveDoc } from "../../lib/habits/storage";
import { useTodayYmd } from "../../lib/habits/useTodayYmd";
import { ExportImportControls } from "./ExportImportControls";
import { TodayPanel } from "./TodayPanel";
import { Heatmap } from "./Heatmap";

export function TrackerApp() {
  const [doc, setDoc] = useState<TrackerDoc | null>(null);
  const didLoadRef = useRef(false);
  const today = useTodayYmd();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadDoc();
      if (cancelled) return;
      setDoc(loaded);
      didLoadRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!doc) return;
    if (!didLoadRef.current) return;
    void saveDoc(doc);
  }, [doc]);

  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Habit Tracker</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Simple daily tracking with a GitHub-style calendar heatmap.
            </p>
          </div>

          <ExportImportControls
            onExport={() => exportDoc(doc)}
            onImport={(jsonText) => {
              const imported = importDocFromJson(jsonText);
              setDoc(imported);
            }}
            onReset={() => setDoc(createDefaultDoc())}
          />
        </header>

        <TodayPanel doc={doc} setDoc={setDoc} today={today} />
        <Heatmap doc={doc} />
      </div>
    </div>
  );
}
