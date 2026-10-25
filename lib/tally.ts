/**
 * Official Tally Prime XML Generator for Sales & Purchase Vouchers
 * Conforms to Tally XML standard format (Tally.ERP 9 / Tally Prime 1.0 - 4.0+)
 * Features:
 * - Party Ledger with State & GSTIN mapping
 * - Sales / Purchase Account with GST slab distinction
 * - Duty Ledgers: Output/Input CGST, SGST, IGST, and Cess
 * - Section 170 statutory Round-Off ledger
 * - XML entity escaping and ledger debit/credit balance symmetry
 */

export interface TallyInvoiceRecord {
  id?: string;
  data: {
    invoice_number?: string;
    invoice_date?: string; // DD-MM-YYYY, YYYY-MM-DD, etc.
    seller_gstin?: string;
    buyer_gstin?: string;
    seller_gstin_info?: { legal_name?: string; trade_name?: string };
    buyer_gstin_info?: { legal_name?: string; trade_name?: string };
    invoice_type?: "B2B" | "B2C";
    pos?: string;
    taxable_value?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    cess?: number;
    invoice_total?: number;
    direction?: "outward" | "inward";
    is_inward?: boolean;
    is_rcm?: boolean;
  };
}

/**
 * Escapes reserved XML characters to prevent parsing syntax errors in Tally Prime.
 */
export function escapeXML(str?: string): string {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Normalizes any standard date string into Tally's mandatory YYYYMMDD format.
 * (e.g. "24-10-2026" or "2026-10-24" -> "20261024")
 */
export function formatTallyDate(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== "string") {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}${m}${d}`;
  }

  const cleaned = dateStr.replace(/[./]/g, "-").trim();
  const parts = cleaned.split("-");

  // YYYY-MM-DD
  if (parts[0]?.length === 4 && parts.length >= 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, "0");
    const d = parts[2].padStart(2, "0");
    return `${y}${m}${d}`;
  }

  // DD-MM-YYYY
  if (parts.length >= 3) {
    const d = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    let y = parts[2];
    if (y.length === 2) y = "20" + y;
    return `${y}${m}${d}`;
  }

  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Returns Indian State name for 2-digit GST state code.
 */
export function getTallyStateName(posCode?: string): string {
  const stateMap: Record<string, string> = {
    "01": "Jammu & Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "26": "Dadra and Nagar Haveli and Daman and Diu",
    "27": "Maharashtra",
    "28": "Andhra Pradesh (Old)",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman & Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
    "97": "Other Territory",
  };
  const code = (posCode || "").slice(0, 2);
  return stateMap[code] || "Delhi";
}

/**
 * Calculates effective GST rate slab (e.g. 18%, 12%, 5%, 28%) from tax amounts.
 */
export function getEffectiveGSTRate(txval: number, taxTotal: number): number {
  if (txval <= 0 || taxTotal <= 0) return 0;
  return Math.round((taxTotal / txval) * 100);
}

/**
 * Generates an official, import-ready Tally Prime XML envelope string.
 */
export function generateTallyXML(
  userGSTIN: string,
  invoices: TallyInvoiceRecord[],
  companyName: string = "GSTLens Company"
): string {
  const normUserGSTIN = (userGSTIN || "").trim().toUpperCase();
  const vouchersXML: string[] = [];

  for (const inv of invoices) {
    const d = inv.data || {};
    const seller = (d.seller_gstin || "").trim().toUpperCase();
    const buyer = (d.buyer_gstin || "").trim().toUpperCase();

    // Voucher direction determination:
    // 1. Explicit voucher type / direction takes absolute priority
    // 2. Fallback to GSTIN matching (seller == user -> sales, buyer == user -> purchase)
    let isOutward = true;
    if (d.direction === "inward" || d.is_inward === true) {
      isOutward = false;
    } else if (d.direction === "outward" || d.is_inward === false) {
      isOutward = true;
    } else {
      if (normUserGSTIN && buyer === normUserGSTIN && seller !== normUserGSTIN) {
        isOutward = false;
      } else {
        isOutward = true;
      }
    }

    const inum = (d.invoice_number || "INV-1").trim();
    const dateFormatted = formatTallyDate(d.invoice_date);
    const txval = Number((d.taxable_value || 0).toFixed(2));
    const cgst = Number((d.cgst || 0).toFixed(2));
    const sgst = Number((d.sgst || 0).toFixed(2));
    const igst = Number((d.igst || 0).toFixed(2));
    const cess = Number((d.cess || 0).toFixed(2));
    const totalTax = cgst + sgst + igst + cess;
    const computedTotal = Number((txval + totalTax).toFixed(2));
    const total = d.invoice_total !== undefined && d.invoice_total !== null
      ? Number(Number(d.invoice_total).toFixed(2))
      : computedTotal;

    // Section 170 Round-off calculation: diff between final total and line items
    const roundOff = Number((total - computedTotal).toFixed(2));

    const pos = d.pos || (isOutward ? (buyer ? buyer.slice(0, 2) : normUserGSTIN.slice(0, 2)) : normUserGSTIN.slice(0, 2));
    const stateName = getTallyStateName(pos);
    const gstRate = getEffectiveGSTRate(txval, totalTax);

    if (isOutward) {
      // ----------------- SALES VOUCHER -----------------
      const partyName = d.buyer_gstin_info?.trade_name ||
        d.buyer_gstin_info?.legal_name ||
        (buyer ? `Customer ${buyer}` : "Cash / Counter Customer");
      const partyGSTIN = buyer || "";
      const regType = partyGSTIN ? "Regular" : "Consumer";

      const voucher = `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${dateFormatted}</DATE>
            <REFERENCEDATE>${dateFormatted}</REFERENCEDATE>
            <GSTREGISTRATIONTYPE>${regType}</GSTREGISTRATIONTYPE>
            <STATENAME>${escapeXML(stateName)}</STATENAME>
            <PLACEOFSUPPLY>${escapeXML(stateName)}</PLACEOFSUPPLY>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXML(inum)}</VOUCHERNUMBER>
            <REFERENCE>${escapeXML(inum)}</REFERENCE>
            <PARTYLEDGERNAME>${escapeXML(partyName)}</PARTYLEDGERNAME>
            <PARTYNAME>${escapeXML(partyName)}</PARTYNAME>
            <PARTYGSTIN>${escapeXML(partyGSTIN)}</PARTYGSTIN>
            <ISINVOICE>Yes</ISINVOICE>

            <!-- 1. Party Account (Debit = Negative Amount in Tally) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXML(partyName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>-${total.toFixed(2)}</AMOUNT>
              <BILLALLOCATIONS.LIST>
                <NAME>${escapeXML(inum)}</NAME>
                <BILLTYPE>New Ref</BILLTYPE>
                <AMOUNT>-${total.toFixed(2)}</AMOUNT>
              </BILLALLOCATIONS.LIST>
            </ALLLEDGERENTRIES.LIST>

            <!-- 2. Sales Account (Credit = Positive Amount in Tally) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account${gstRate > 0 ? ` @ ${gstRate}%` : " Exempt"}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${txval.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            ${cgst > 0 ? `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output CGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${cgst.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>` : ""}

            ${sgst > 0 ? `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output SGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${sgst.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>` : ""}

            ${igst > 0 ? `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output IGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${igst.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>` : ""}

            ${cess > 0 ? `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Output GST Cess</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${cess.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>` : ""}

            ${Math.abs(roundOff) > 0.001 ? `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Round Off</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${roundOff < 0 ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
              <AMOUNT>${roundOff.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>` : ""}
          </VOUCHER>
        </TALLYMESSAGE>`;
      vouchersXML.push(voucher.trim());
    } else {
      // ----------------- PURCHASE VOUCHER -----------------
      let vendorName = d.seller_gstin_info?.trade_name ||
        d.seller_gstin_info?.legal_name ||
        (seller ? `Vendor ${seller}` : "General Supplier");
      let vendorGSTIN = seller || "";

      // If user is listed as seller (e.g. sample invoice in workspace exported as Purchase voucher),
      // the counterparty vendor in the purchase entry should be the buyer!
      if (normUserGSTIN && seller === normUserGSTIN && buyer && buyer !== normUserGSTIN) {
        vendorName = d.buyer_gstin_info?.trade_name || d.buyer_gstin_info?.legal_name || `Vendor ${buyer}`;
        vendorGSTIN = buyer;
      }

      const vendorPos = vendorGSTIN ? vendorGSTIN.slice(0, 2) : pos;
      const vendorStateName = getTallyStateName(vendorPos);

      const voucher = `
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${dateFormatted}</DATE>
            <REFERENCEDATE>${dateFormatted}</REFERENCEDATE>
            <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
            <STATENAME>${escapeXML(vendorStateName)}</STATENAME>
            <PLACEOFSUPPLY>${escapeXML(stateName)}</PLACEOFSUPPLY>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXML(inum)}</VOUCHERNUMBER>
            <REFERENCE>${escapeXML(inum)}</REFERENCE>
            <PARTYLEDGERNAME>${escapeXML(vendorName)}</PARTYLEDGERNAME>
            <PARTYNAME>${escapeXML(vendorName)}</PARTYNAME>
            <PARTYGSTIN>${escapeXML(vendorGSTIN)}</PARTYGSTIN>
            <ISINVOICE>Yes</ISINVOICE>

            <!-- 1. Party Account (Credit = Positive Amount in Tally for Purchase) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXML(vendorName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>${total.toFixed(2)}</AMOUNT>
              <BILLALLOCATIONS.LIST>
                <NAME>${escapeXML(inum)}</NAME>
                <BILLTYPE>New Ref</BILLTYPE>
                <AMOUNT>${total.toFixed(2)}</AMOUNT>
              </BILLALLOCATIONS.LIST>
            </ALLLEDGERENTRIES.LIST>

            <!-- 2. Purchase Account (Debit = Negative Amount in Tally for Purchase) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Purchase Account${gstRate > 0 ? ` @ ${gstRate}%` : " Exempt"}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${txval.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            ${cgst > 0 ? `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Input CGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${cgst.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>` : ""}

            ${sgst > 0 ? `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Input SGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${sgst.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>` : ""}

            ${igst > 0 ? `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Input IGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${igst.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>` : ""}

            ${cess > 0 ? `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Input GST Cess</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${cess.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>` : ""}

            ${Math.abs(roundOff) > 0.001 ? `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Round Off</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${roundOff > 0 ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
              <AMOUNT>-${roundOff.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>` : ""}
          </VOUCHER>
        </TALLYMESSAGE>`;
      vouchersXML.push(voucher.trim());
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXML(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${vouchersXML.join("\n")}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Triggers browser 1-click download of generated Tally Prime XML file.
 */
export function downloadTallyXML(filename: string, xmlContent: string): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xml") ? filename : `${filename}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
