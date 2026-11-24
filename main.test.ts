import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const MAIN = fileURLToPath(new URL("./main.ts", import.meta.url));

function makeDir(t: test.TestContext): string {
  const dir = mkdtempSync(join(tmpdir(), "warning-label-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function run(dir: string, viaEnv = false): Buffer {
  const res = spawnSync(
    process.execPath,
    viaEnv ? [MAIN] : [MAIN, dir],
    { env: viaEnv ? { ...process.env, MAKEFUN_OUTPUT_DIR: dir } : process.env },
  );
  assert.equal(res.status, 0, res.stderr.toString());
  return readFileSync(join(dir, "entry.txt"));
}

test("writes to <dir>/entry.txt from a directory argument", (t) => {
  const dir = makeDir(t);
  run(dir);
  assert.ok(existsSync(join(dir, "entry.txt")));
});

test("writes to $MAKEFUN_OUTPUT_DIR/entry.txt", (t) => {
  const dir = makeDir(t);
  run(dir, true);
  assert.ok(existsSync(join(dir, "entry.txt")));
});

test("is deterministic across runs", (t) => {
  const a = run(makeDir(t));
  const b = run(makeDir(t));
  assert.deepEqual(a, b);
});

test("is exactly one line with no newline", (t) => {
  const text = run(makeDir(t)).toString("utf8");
  assert.ok(text.length > 0);
  assert.ok(!text.includes("\n") && !text.includes("\r"));
  assert.ok(text.trim().length > 0);
});

test("is at most 160 Unicode characters", (t) => {
  const text = run(makeDir(t)).toString("utf8");
  assert.ok([...text].length <= 160, `got ${[...text].length} characters`);
});
