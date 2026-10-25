import test from "node:test";
import assert from "node:assert/strict";
import { getFP } from "../lib/storage.ts";

test("getFP correctly parses various date formats into MMYYYY", () => {
  // DD-MM-YYYY
  assert.equal(getFP("24-10-2026"), "102026");

  // DD.MM.YYYY (dot format from OCR)
  assert.equal(getFP("15.08.2025"), "082025");

  // DD/MM/YYYY (slash format)
  assert.equal(getFP("01/01/2026"), "012026");

  // YYYY-MM-DD (ISO format)
  assert.equal(getFP("2026-04-30"), "042026");

  // Month names (e.g. 15-Aug-25)
  assert.equal(getFP("15-Aug-25"), "082025");
  assert.equal(getFP("10-dec-2024"), "122024");
});

test("getFP handles missing, invalid, or non-string inputs", () => {
  assert.equal(getFP(undefined), "UNKNOWN");
  assert.equal(getFP(""), "UNKNOWN");
  assert.equal(getFP("invalid-date-format"), "UNKNOWN");
});
