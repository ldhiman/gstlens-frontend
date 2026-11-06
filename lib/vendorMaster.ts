import { Client, getAllClients, saveClient } from "./storage";
import { STATE_CODE_MAP } from "./gstBillingEngine";

export interface VendorMasterInput {
  supplierName: string;
  supplierGstin?: string;
  supplierAddress?: string;
  supplierCity?: string;
  supplierPincode?: string;
  pos?: string;
}

/**
 * Auto-masters vendor profiles from extracted purchase bills and invoices.
 * If vendor already exists, intelligently backfills missing address / state and promotes type to 'both'.
 * If vendor does not exist, registers them into IndexedDB `clients` as 'vendor' with auto-derived PAN & State.
 */
export async function autoMasterVendorFromPurchase(
  input: VendorMasterInput
): Promise<Client | null> {
  const cleanName = input.supplierName?.trim();
  const cleanGstin = input.supplierGstin?.trim().toUpperCase();

  if (!cleanName && !cleanGstin) {
    return null;
  }

  const existingClients = await getAllClients().catch(() => []);

  // 1. Check for existing match by GSTIN first, then by exact normalized Name
  let matched = existingClients.find((c) => {
    if (cleanGstin && c.gstin && c.gstin.toUpperCase() === cleanGstin) {
      return true;
    }
    if (!cleanGstin && cleanName && c.name.trim().toLowerCase() === cleanName.toLowerCase()) {
      return true;
    }
    return false;
  });

  // Extract 2-digit state code
  let stateCode: string | undefined = undefined;
  if (cleanGstin && cleanGstin.length >= 2 && /^\d{2}/.test(cleanGstin)) {
    stateCode = cleanGstin.slice(0, 2);
  } else if (input.pos && /^\d{2}/.test(input.pos)) {
    stateCode = input.pos.slice(0, 2);
  }

  const stateName = stateCode ? STATE_CODE_MAP[stateCode] || undefined : undefined;

  // Extract 10-character PAN from 15-character GSTIN (Characters 3 to 12)
  let pan: string | undefined = undefined;
  if (cleanGstin && cleanGstin.length === 15) {
    pan = cleanGstin.slice(2, 12);
  }

  if (matched) {
    let modified = false;
    const updated: Client = { ...matched };

    // Upgrade client role if they were previously only a customer
    if (updated.type === "customer") {
      updated.type = "both";
      modified = true;
    } else if (!updated.type) {
      updated.type = "vendor";
      modified = true;
    }

    // Backfill missing fields
    if (!updated.gstin && cleanGstin) {
      updated.gstin = cleanGstin;
      modified = true;
    }
    if (!updated.pan && pan) {
      updated.pan = pan;
      modified = true;
    }
    if (!updated.address && input.supplierAddress) {
      updated.address = input.supplierAddress.trim();
      modified = true;
    }
    if (!updated.stateCode && stateCode) {
      updated.stateCode = stateCode;
      updated.state = stateName;
      modified = true;
    }

    if (modified) {
      await saveClient(updated);
    }
    return updated;
  }

  // 2. Create new Vendor profile
  const newVendor: Client = {
    id: `vnd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName || (cleanGstin ? `Vendor ${cleanGstin}` : "New Vendor"),
    tradeName: cleanName,
    gstin: cleanGstin || undefined,
    pan,
    address: input.supplierAddress?.trim() || undefined,
    city: input.supplierCity?.trim() || undefined,
    state: stateName,
    stateCode,
    pincode: input.supplierPincode?.trim() || undefined,
    type: "vendor",
    created_at: Date.now(),
  };

  await saveClient(newVendor);
  return newVendor;
}
