import { useRef, useState } from "react";

type Props = {
  onExport: () => string;
  onImport: (jsonText: string) => void;
  onReset: () => void;
};

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ExportImportControls({ onExport, onImport, onReset }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100"
          onClick={() => {
            setError(null);
            const json = onExport();
            const stamp = new Date().toISOString().slice(0, 10);
            downloadTextFile(`habit-tracker-export_${stamp}.json`, json);
          }}
        >
          Export
        </button>

        <button
          type="button"
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100"
          onClick={() => {
            setError(null);
            fileInputRef.current?.click();
          }}
        >
          Import
        </button>

        <button
          type="button"
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100"
          onClick={() => {
            setError(null);
            if (confirm("Reset all data in this browser? (You can export first.)")) onReset();
          }}
        >
          Reset
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            try {
              setError(null);
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              onImport(text);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Import failed.");
            } finally {
              // allow selecting the same file again
              e.target.value = "";
            }
          }}
        />
      </div>

      {error ? (
        <div className="text-xs text-red-600 dark:text-red-400">{error}</div>
      ) : null}
    </div>
  );
}
