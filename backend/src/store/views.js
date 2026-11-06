// View counts for listings (Arkiv entity keys), kept in DATA_DIR/views.json.
// Views are off-chain on purpose: counting a page view isn't worth an Arkiv write.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEDUPE_MS = 10 * 60 * 1000; // one view per visitor per listing per 10 minutes
const SAVE_DELAY_MS = 2_000;

export function createViewStore(dataDir) {
  const file = path.join(dataDir, "views.json");
  const counts = new Map();
  const recent = new Map(); // `${visitor}|${key}` -> last counted (ms)
  let saveTimer = null;

  try {
    for (const [k, n] of Object.entries(JSON.parse(readFileSync(file, "utf8")))) counts.set(k, Number(n) || 0);
  } catch {
    /* no file yet */
  }

  function save() {
    saveTimer = null;
    mkdirSync(dataDir, { recursive: true });
    const tmp = `${file}.tmp`;
    writeFileSync(tmp, JSON.stringify(Object.fromEntries(counts)));
    renameSync(tmp, file); // atomic replace: never leaves a half-written file
  }

  function scheduleSave() {
    if (!saveTimer) saveTimer = setTimeout(save, SAVE_DELAY_MS);
    saveTimer.unref?.();
  }

  return {
    /** Counts a view unless this visitor viewed the same key recently. Returns the total. */
    record(key, visitor, now = Date.now()) {
      const id = `${visitor}|${key}`;
      const last = recent.get(id);
      if (!last || now - last >= DEDUPE_MS) {
        recent.set(id, now);
        counts.set(key, (counts.get(key) ?? 0) + 1);
        scheduleSave();
        if (recent.size > 50_000) for (const [k, t] of recent) if (now - t >= DEDUPE_MS) recent.delete(k);
      }
      return counts.get(key) ?? 0;
    },
    get: (key) => counts.get(key) ?? 0,
    many: (keys) => Object.fromEntries(keys.map((k) => [k, counts.get(k) ?? 0])),
    top: (n) => [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, views]) => ({ key, views })),
    flush: () => (saveTimer ? (clearTimeout(saveTimer), save()) : undefined),
  };
}
