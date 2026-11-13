import test from "node:test";
import assert from "node:assert/strict";
import { searchHsnSac, POPULAR_HSN_SAC_CODES } from "../lib/hsnData.ts";

test("POPULAR_HSN_SAC_CODES contains comprehensive HSN and SAC dataset", () => {
  assert.ok(POPULAR_HSN_SAC_CODES.length >= 25);
  const hsnItems = POPULAR_HSN_SAC_CODES.filter((x) => x.type === "HSN");
  const sacItems = POPULAR_HSN_SAC_CODES.filter((x) => x.type === "SAC");
  assert.ok(hsnItems.length > 10, "Should have multiple HSN goods items");
  assert.ok(sacItems.length > 5, "Should have multiple SAC services items");
});

test("searchHsnSac matches code exactly or partially", () => {
  const result = searchHsnSac("8471");
  assert.ok(result.length > 0);
  assert.equal(result[0].code, "8471");
  assert.ok(result[0].description.toLowerCase().includes("computers"));
  assert.equal(result[0].gstRate, 18);
});

test("searchHsnSac performs case-insensitive description search", () => {
  const result = searchHsnSac("CONSULTING");
  assert.ok(result.length > 0);
  assert.ok(result.some((item) => item.code === "998311" || item.code === "998313"));
});

test("searchHsnSac filters by category properly", () => {
  const techOnly = searchHsnSac("", "Electronics & Tech");
  assert.ok(techOnly.length > 0);
  for (const item of techOnly) {
    assert.equal(item.category, "Electronics & Tech");
  }
});
