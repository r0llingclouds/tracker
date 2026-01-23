import type { TrackerDoc } from "./schema";
import { createDefaultDoc, migrateToLatest } from "./doc";

const STORAGE_KEY = "habit_tracker_doc";

function loadDocFromLocalStorage(): TrackerDoc {
  if (typeof window === "undefined") return createDefaultDoc();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultDoc();
    const parsed = JSON.parse(raw) as unknown;
    return migrateToLatest(parsed);
  } catch {
    return createDefaultDoc();
  }
}

function cacheDocToLocalStorage(doc: TrackerDoc): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // ignore quota / disabled storage; app stays usable for the session
  }
}

/**
 * Loads the tracker doc preferring the local disk-backed API, falling back
 * to browser localStorage if the API isn't reachable (e.g. static deploy).
 */
export async function loadDoc(): Promise<TrackerDoc> {
  if (typeof window === "undefined") return createDefaultDoc();

  try {
    const res = await fetch("http://localhost:3001/api/habits", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data.isNew) {
        // Server has no data yet, return default doc
        return createDefaultDoc();
      }
      const parsed = data as unknown;
      const doc = migrateToLatest(parsed);
      cacheDocToLocalStorage(doc);
      return doc;
    }
  } catch {
    // ignore and fallback
  }

  return loadDocFromLocalStorage();
}

/**
 * Saves to localStorage (best effort) and also to the disk-backed API when available.
 */
export async function saveDoc(doc: TrackerDoc): Promise<void> {
  if (typeof window === "undefined") return;

  cacheDocToLocalStorage(doc);

  try {
    await fetch("http://localhost:3001/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    });
  } catch {
    // ignore: localStorage already has a copy
  }
}
