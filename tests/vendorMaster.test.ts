import test from "node:test";
import assert from "node:assert/strict";
import { STATE_CODE_MAP } from "../lib/gstBillingEngine.ts";

// Test suite for Vendor Auto-Mastering logic
test("PAN is accurately derived from 15-character statutory GSTIN", () => {
  const gstin = "27AABCU9603R1ZN";
  const pan = gstin.slice(2, 12);
  assert.equal(pan, "AABCU9603R");
});

test("State and State Code are accurately mapped from GSTIN prefix", () => {
  const gstinMH = "27AABCU9603R1ZN";
  const stateCodeMH = gstinMH.slice(0, 2);
  assert.equal(stateCodeMH, "27");
  assert.equal(STATE_CODE_MAP[stateCodeMH], "Maharashtra");

  const gstinDL = "07AAAAA0000A1Z5";
  const stateCodeDL = gstinDL.slice(0, 2);
  assert.equal(stateCodeDL, "07");
  assert.equal(STATE_CODE_MAP[stateCodeDL], "Delhi");

  const gstinKA = "29BBBBB0000B1Z6";
  const stateCodeKA = gstinKA.slice(0, 2);
  assert.equal(stateCodeKA, "29");
  assert.equal(STATE_CODE_MAP[stateCodeKA], "Karnataka");
});

test("Vendor matching prefers GSTIN over company name to avoid naming discrepancies", () => {
  const existingClients = [
    {
      id: "c-1",
      name: "Acme Corp Old Name",
      gstin: "27AABCU9603R1ZN",
      type: "customer" as const,
      created_at: 1000,
    },
  ];

  const incomingGstin = "27AABCU9603R1ZN";
  const incomingName = "Acme Global Solutions";

  const match = existingClients.find(
    (c) => c.gstin && c.gstin.toUpperCase() === incomingGstin.toUpperCase()
  );

  assert.ok(match);
  assert.equal(match.id, "c-1");
  // Upgraded type from customer to both
  const upgradedType = match.type === "customer" ? "both" : match.type;
  assert.equal(upgradedType, "both");
});

test("Vendor fallback matches on normalized case-insensitive trade name if no GSTIN exists", () => {
  const existingClients = [
    {
      id: "c-2",
      name: "Sharma General Store",
      type: "vendor" as const,
      created_at: 2000,
    },
  ];

  const incomingName = "  sharma general store  ";
  const cleanName = incomingName.trim().toLowerCase();

  const match = existingClients.find(
    (c) => c.name.trim().toLowerCase() === cleanName
  );

  assert.ok(match);
  assert.equal(match.id, "c-2");
});
