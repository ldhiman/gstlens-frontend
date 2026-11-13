import test from "node:test";
import assert from "node:assert/strict";
import {
  getRule48CopyBadge,
  RULE_48_COPIES,
  checkPrintEligibility,
  type Rule48CopyType,
} from "../lib/printRule48.ts";

test("Rule 48 Statutory Copy Badges: Original for Recipient", () => {
  const badge = getRule48CopyBadge("original");
  assert.equal(badge.badge, "ORIGINAL FOR RECIPIENT");
  assert.ok(badge.sub.includes("Rule 48(1)(a)"));
  assert.ok(badge.color.includes("blue"));
});

test("Rule 48 Statutory Copy Badges: Duplicate for Transporter", () => {
  const badge = getRule48CopyBadge("duplicate");
  assert.equal(badge.badge, "DUPLICATE FOR TRANSPORTER");
  assert.ok(badge.sub.includes("Rule 48(1)(b)"));
  assert.ok(badge.color.includes("amber"));
});

test("Rule 48 Statutory Copy Badges: Triplicate for Supplier", () => {
  const badge = getRule48CopyBadge("triplicate");
  assert.equal(badge.badge, "TRIPLICATE FOR SUPPLIER");
  assert.ok(badge.sub.includes("Rule 48(1)(c)"));
  assert.ok(badge.color.includes("purple"));
});

test("Rule 48 Eco-Saver Badge: 2-in-1 Dual Copy", () => {
  const badge = getRule48CopyBadge("eco-dual");
  assert.ok(badge.badge.includes("2-IN-1"));
  assert.ok(badge.sub.includes("Eco-Saver"));
  assert.ok(badge.color.includes("emerald"));
});

test("Rule 48 Eco-Saver Badge: 3-in-1 Triple Copy", () => {
  const badge = getRule48CopyBadge("eco-triple");
  assert.ok(badge.badge.includes("3-IN-1"));
  assert.ok(badge.sub.includes("3-in-1 Eco-Saver"));
  assert.ok(badge.color.includes("emerald"));
});

test("Rule 48 Eco-Saver Badge: 3-in-2 Smart Copy", () => {
  const badge = getRule48CopyBadge("eco-3in2");
  assert.ok(badge.badge.includes("3-IN-2"));
  assert.ok(badge.sub.includes("3-in-2 Eco-Saver"));
  assert.ok(badge.color.includes("teal"));
});

test("Rule 48 Statutory Copy Badges: Fallback for 'all' or unknown maps to Original", () => {
  const badgeAll = getRule48CopyBadge("all");
  assert.equal(badgeAll.badge, "ORIGINAL FOR RECIPIENT");
  assert.ok(badgeAll.sub.includes("Rule 48(1)(a)"));

  const badgeFallback = getRule48CopyBadge("random" as any);
  assert.equal(badgeFallback.badge, "ORIGINAL FOR RECIPIENT");
});

test("Rule 48 Triplicate Multi-Copy Flow: Generates exactly 3 sequential copies", () => {
  const copiesToPrint: Rule48CopyType[] = ["original", "duplicate", "triplicate"];
  const badges = copiesToPrint.map((copy) => getRule48CopyBadge(copy));

  assert.equal(badges.length, 3);
  assert.equal(badges[0].badge, "ORIGINAL FOR RECIPIENT");
  assert.equal(badges[1].badge, "DUPLICATE FOR TRANSPORTER");
  assert.equal(badges[2].badge, "TRIPLICATE FOR SUPPLIER");
});

test("RULE_48_COPIES metadata contains statutory copy descriptions including 2-in-1, 3-in-1 and 3-in-2", () => {
  assert.equal(RULE_48_COPIES.length, 7);
  const ids = RULE_48_COPIES.map((c) => c.id);
  assert.deepEqual(ids, [
    "original",
    "duplicate",
    "triplicate",
    "all",
    "eco-dual",
    "eco-triple",
    "eco-3in2",
  ]);
});

test("checkPrintEligibility evaluates 3-in-1, 3-in-2, and 2-in-1 based on item counts", () => {
  // Small bill (2 items) -> Eligible for all
  const small = checkPrintEligibility(2);
  assert.equal(small.can3in1, true);
  assert.equal(small.can3in2, true);
  assert.equal(small.can2in1, true);
  assert.ok(small.reason3in1.includes("Eligible for 3-in-1"));

  // Medium bill (5 items) -> Eligible for 3-in-2 and 2-in-1, but not 3-in-1
  const medium = checkPrintEligibility(5);
  assert.equal(medium.can3in1, false);
  assert.equal(medium.can3in2, true);
  assert.equal(medium.can2in1, true);

  // Large bill (7 items) -> Eligible for 3-in-2, but not 3-in-1 or 2-in-1
  const large = checkPrintEligibility(7);
  assert.equal(large.can3in1, false);
  assert.equal(large.can3in2, true);
  assert.equal(large.can2in1, false);

  // Very large bill (12 items) -> None of the eco-savers recommended
  const veryLarge = checkPrintEligibility(12);
  assert.equal(veryLarge.can3in1, false);
  assert.equal(veryLarge.can3in2, false);
  assert.equal(veryLarge.can2in1, false);
});
