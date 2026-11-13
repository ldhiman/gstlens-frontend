import test from "node:test";
import assert from "node:assert/strict";
import {
  SCAN_PIPELINE_STEPS,
  resolveStepIndex,
  computeNextProgress,
  formatElapsedSeconds,
  formatFileSize,
  isAbortError,
} from "../lib/scanProgress.ts";

test("resolveStepIndex maps explicit pipeline stages deterministically", () => {
  assert.equal(resolveStepIndex("compressing", 0), 0);
  assert.equal(resolveStepIndex("ocr", 0), 1);
  assert.equal(resolveStepIndex("verifying", 0), 2);
  assert.equal(resolveStepIndex("finalizing", 0), 3);
  assert.equal(SCAN_PIPELINE_STEPS.length, 4);
});

test("resolveStepIndex advances monotonically without looping back on long scans", () => {
  const s0 = resolveStepIndex(undefined, 0);
  const s3 = resolveStepIndex(undefined, 3);
  const s7 = resolveStepIndex(undefined, 7);
  const s15 = resolveStepIndex(undefined, 15);
  const s60 = resolveStepIndex(undefined, 60);

  assert.equal(s0, 0);
  assert.equal(s3, 1);
  assert.equal(s7, 2);
  assert.equal(s15, 3);
  assert.equal(s60, 3);
});

test("computeNextProgress never regresses and respects stage boundaries", () => {
  // Starts at compressing floor
  let p = computeNextProgress(0, "compressing");
  assert.ok(p >= 12 && p <= 24);

  // Advances to ocr floor immediately when stage changes
  p = computeNextProgress(p, "ocr");
  assert.ok(p >= 25 && p <= 84);

  // Monotonic progression during long ocr wait
  for (let i = 0; i < 30; i++) {
    const next = computeNextProgress(p, "ocr");
    assert.ok(next >= p, `Progress regressed from ${p} to ${next}`);
    assert.ok(next <= 84, `Progress exceeded ocr ceiling: ${next}`);
    p = next;
  }

  // Transitions cleanly through verifying and finalizing
  p = computeNextProgress(p, "verifying");
  assert.ok(p >= 85 && p <= 94);

  p = computeNextProgress(p, "finalizing");
  assert.ok(p >= 95 && p <= 99);
});

test("formatElapsedSeconds formats seconds and minutes cleanly", () => {
  assert.equal(formatElapsedSeconds(-2), "0s");
  assert.equal(formatElapsedSeconds(0), "0s");
  assert.equal(formatElapsedSeconds(8), "8s");
  assert.equal(formatElapsedSeconds(60), "1m 00s");
  assert.equal(formatElapsedSeconds(65), "1m 05s");
});

test("formatFileSize formats bytes, KB, and MB cleanly", () => {
  assert.equal(formatFileSize(undefined), "");
  assert.equal(formatFileSize(0), "");
  assert.equal(formatFileSize(512), "512 B");
  assert.equal(formatFileSize(450 * 1024), "450 KB");
  assert.equal(formatFileSize(2.4 * 1024 * 1024), "2.4 MB");
});

test("isAbortError detects cancelled fetch errors accurately", () => {
  const domAbort = new Error("The operation was aborted");
  domAbort.name = "AbortError";
  assert.equal(isAbortError(domAbort), true);

  const nodeAbort = Object.assign(new Error("Aborted"), { code: "ABORT_ERR" });
  assert.equal(isAbortError(nodeAbort), true);

  assert.equal(isAbortError(new Error("Network failure")), false);
  assert.equal(isAbortError(null), false);
});
