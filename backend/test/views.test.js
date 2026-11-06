import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createViewStore } from "../src/store/views.js";

const KEY = "0x" + "ab".repeat(32);
const OTHER = "0x" + "cd".repeat(32);

test("counts once per visitor per 10 minutes", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "views-"));
  const s = createViewStore(dir);
  const t = 1_000_000;
  assert.equal(s.record(KEY, "1.1.1.1", t), 1);
  assert.equal(s.record(KEY, "1.1.1.1", t + 60_000), 1); // refresh within 10 min
  assert.equal(s.record(KEY, "2.2.2.2", t + 60_000), 2); // another visitor
  assert.equal(s.record(KEY, "1.1.1.1", t + 10 * 60_000), 3); // after 10 min
  rmSync(dir, { recursive: true, force: true });
});

test("persists to disk and reloads", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "views-"));
  const a = createViewStore(dir);
  a.record(KEY, "1.1.1.1");
  a.record(OTHER, "1.1.1.1");
  a.record(OTHER, "2.2.2.2");
  a.flush();
  assert.deepEqual(JSON.parse(readFileSync(path.join(dir, "views.json"), "utf8")), { [KEY]: 1, [OTHER]: 2 });
  const b = createViewStore(dir);
  assert.equal(b.get(OTHER), 2);
  assert.deepEqual(b.top(1), [{ key: OTHER, views: 2 }]);
  assert.deepEqual(b.many([KEY, "0xmissing"]), { [KEY]: 1, "0xmissing": 0 });
  rmSync(dir, { recursive: true, force: true });
});
