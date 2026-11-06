type Invoice = any;

/**
 * Known statutory GST rate slabs in India (CGST/SGST/IGST):
 * 0%, 0.1% (merchant export), 0.25% (rough gems), 1.5% (worked gems/jewellery),
 * 3% (gold/precious metals), 5%, 6%, 7.5% (hospitality/real estate), 12%, 18%, 28%
 */
const STATUTORY_GST_RATES = [0, 0.1, 0.25, 1.5, 3, 5, 6, 7.5, 12, 18, 28];

/**
 * Standard threshold for B2C Large (Table 5) inter-state outward supplies (₹2,50,000)
 */
export const B2CL_THRESHOLD = 250000;

export function generateGSTR1JSON(
  sellerGSTIN: string,
  fp: string, // filing period e.g. "082025" or "102026"
  invoices: Invoice[],
  options?: {
    b2clThreshold?: number;
  }
) {
  const b2b: any[] = [];
  const b2clMap: Record<string, any> = {};
  const b2cRaw: any[] = [];
  const b2csSummaryMap: Record<string, any> = {};
  const hsnSummaryMap: Record<string, any> = {};

  const threshold = options?.b2clThreshold ?? B2CL_THRESHOLD;
  const sellerState = sellerGSTIN ? sellerGSTIN.slice(0, 2) : "07";

  for (const inv of invoices) {
    const data = inv.data || inv || {};
    const pos = String(data.pos || (data.seller_gstin ? data.seller_gstin.slice(0, 2) : sellerState)).padStart(2, "0");
    const isInterstate = pos !== sellerState;
    const isRcm = Boolean(data.reverse_charge || inv.reverse_charge);
    const rchrg = isRcm ? "Y" : "N";
    const invTyp = data.inv_typ || (data.is_deemed_export ? "DE" : data.is_sez ? "SEZWP" : "R");

    const total = Number((data.invoice_total || 0).toFixed(2));
    const rawItems: any[] = Array.isArray(data.items) && data.items.length > 0 ? data.items : [];

    // Construct rate-wise items for this invoice
    let invoiceItems: any[] = [];

    if (rawItems.length > 0) {
      // Group items by tax rate for invoice itms breakdown
      const rateMap = new Map<number, { txval: number; iamt: number; camt: number; samt: number; csamt: number }>();

      for (const it of rawItems) {
        const itRate = Number(it.taxPercent ?? it.tax_rate ?? it.rate ?? getTaxRate(it));
        const itTxval = Number((it.taxable_value ?? it.taxableValue ?? it.amount ?? 0).toFixed(2));
        const itIamt = Number((it.igst ?? (isInterstate ? (itTxval * itRate) / 100 : 0)).toFixed(2));
        const itCamt = Number((it.cgst ?? (!isInterstate ? (itTxval * itRate) / 200 : 0)).toFixed(2));
        const itSamt = Number((it.sgst ?? (!isInterstate ? (itTxval * itRate) / 200 : 0)).toFixed(2));
        const itCsamt = Number((it.cess ?? 0).toFixed(2));

        const existing = rateMap.get(itRate) || { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 };
        existing.txval = Number((existing.txval + itTxval).toFixed(2));
        existing.iamt = Number((existing.iamt + itIamt).toFixed(2));
        existing.camt = Number((existing.camt + itCamt).toFixed(2));
        existing.samt = Number((existing.samt + itSamt).toFixed(2));
        existing.csamt = Number((existing.csamt + itCsamt).toFixed(2));
        rateMap.set(itRate, existing);

        // Populate Table 12 HSN Summary from item
        const hsnCode = String(it.hsn || it.hsn_sc || "9999").trim();
        const uqc = String(it.unit || it.uqc || "NOS").trim().toUpperCase();
        const hsnKey = `${hsnCode}_${uqc}_${itRate}`;
        const itQty = Number(it.quantity || it.qty || 1);
        const itVal = Number((itTxval + itIamt + itCamt + itSamt + itCsamt).toFixed(2));

        if (!hsnSummaryMap[hsnKey]) {
          hsnSummaryMap[hsnKey] = {
            hsn_sc: hsnCode,
            desc: it.description || it.name || "Goods/Services",
            uqc,
            qty: 0,
            val: 0,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0,
          };
        }
        hsnSummaryMap[hsnKey].qty = Number((hsnSummaryMap[hsnKey].qty + itQty).toFixed(3));
        hsnSummaryMap[hsnKey].val = Number((hsnSummaryMap[hsnKey].val + itVal).toFixed(2));
        hsnSummaryMap[hsnKey].txval = Number((hsnSummaryMap[hsnKey].txval + itTxval).toFixed(2));
        hsnSummaryMap[hsnKey].iamt = Number((hsnSummaryMap[hsnKey].iamt + itIamt).toFixed(2));
        hsnSummaryMap[hsnKey].camt = Number((hsnSummaryMap[hsnKey].camt + itCamt).toFixed(2));
        hsnSummaryMap[hsnKey].samt = Number((hsnSummaryMap[hsnKey].samt + itSamt).toFixed(2));
        hsnSummaryMap[hsnKey].csamt = Number((hsnSummaryMap[hsnKey].csamt + itCsamt).toFixed(2));
      }

      let itemIdx = 1;
      for (const [rt, vals] of rateMap.entries()) {
        invoiceItems.push({
          num: itemIdx++,
          itm_det: {
            txval: vals.txval,
            rt,
            iamt: vals.iamt,
            camt: vals.camt,
            samt: vals.samt,
            csamt: vals.csamt,
          },
        });
      }
    } else {
      // Fallback single line item
      const rt = getTaxRate(data);
      const txval = Number((data.taxable_value || 0).toFixed(2));
      const igst = Number((data.igst || 0).toFixed(2));
      const cgst = Number((data.cgst || 0).toFixed(2));
      const sgst = Number((data.sgst || 0).toFixed(2));
      const csamt = Number((data.cess || 0).toFixed(2));

      invoiceItems = [
        {
          num: 1,
          itm_det: {
            txval,
            rt,
            iamt: igst,
            camt: cgst,
            samt: sgst,
            csamt,
          },
        },
      ];

      // Populate Table 12 HSN Summary from invoice
      const hsnCode = String(data.hsn || data.hsn_sc || "9999").trim();
      const uqc = "OTH";
      const hsnKey = `${hsnCode}_${uqc}_${rt}`;
      if (!hsnSummaryMap[hsnKey]) {
        hsnSummaryMap[hsnKey] = {
          hsn_sc: hsnCode,
          desc: data.description || "General Supplies",
          uqc,
          qty: 1,
          val: 0,
          txval: 0,
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0,
        };
      }
      hsnSummaryMap[hsnKey].val = Number((hsnSummaryMap[hsnKey].val + total).toFixed(2));
      hsnSummaryMap[hsnKey].txval = Number((hsnSummaryMap[hsnKey].txval + txval).toFixed(2));
      hsnSummaryMap[hsnKey].iamt = Number((hsnSummaryMap[hsnKey].iamt + igst).toFixed(2));
      hsnSummaryMap[hsnKey].camt = Number((hsnSummaryMap[hsnKey].camt + cgst).toFixed(2));
      hsnSummaryMap[hsnKey].samt = Number((hsnSummaryMap[hsnKey].samt + sgst).toFixed(2));
      hsnSummaryMap[hsnKey].csamt = Number((hsnSummaryMap[hsnKey].csamt + csamt).toFixed(2));
    }

    const invoiceNumber = String(data.invoice_number || "").trim();
    const invoiceDate = formatDateForGST(data.invoice_date);

    // Section 1: B2B Invoices (Table 4)
    if (data.invoice_type === "B2B" && data.buyer_gstin) {
      const buyerGstin = data.buyer_gstin.trim().toUpperCase();
      let buyer = b2b.find((b) => b.ctin === buyerGstin);

      if (!buyer) {
        buyer = {
          ctin: buyerGstin,
          inv: [],
        };
        b2b.push(buyer);
      }

      buyer.inv.push({
        inum: invoiceNumber,
        idt: invoiceDate,
        val: total,
        pos,
        rchrg,
        inv_typ: invTyp,
        itms: invoiceItems,
      });
    } else {
      // B2C Supply (Unregistered Recipient)
      const b2cItem = {
        inum: invoiceNumber,
        idt: invoiceDate,
        val: total,
        pos,
        rchrg: "N",
        inv_typ: "R",
        itms: invoiceItems,
      };
      b2cRaw.push(b2cItem);

      // Section 2: B2CL (Table 5) - Inter-State supplies to unregistered persons where invoice total > threshold
      if (isInterstate && total > threshold) {
        if (!b2clMap[pos]) {
          b2clMap[pos] = {
            pos,
            inv: [],
          };
        }

        // B2CL schema item: itms contain txval, rt, iamt, csamt
        const b2clItms = invoiceItems.map((it) => ({
          num: it.num,
          itm_det: {
            txval: it.itm_det.txval,
            rt: it.itm_det.rt,
            iamt: it.itm_det.iamt,
            csamt: it.itm_det.csamt || 0,
          },
        }));

        b2clMap[pos].inv.push({
          inum: invoiceNumber,
          idt: invoiceDate,
          val: total,
          itms: b2clItms,
        });
      } else {
        // Section 3: B2CS (Table 7) - Intra-state B2C or Inter-state B2C <= threshold
        const sply_ty = isInterstate ? "INTER" : "INTRA";

        for (const itemEntry of invoiceItems) {
          const itmDet = itemEntry.itm_det;
          const rt = itmDet.rt;
          const key = `${sply_ty}_${pos}_${rt}`;

          if (!b2csSummaryMap[key]) {
            b2csSummaryMap[key] = {
              sply_ty,
              pos,
              typ: "OE",
              rt,
              txval: 0,
              iamt: 0,
              camt: 0,
              samt: 0,
              csamt: 0,
            };
          }

          b2csSummaryMap[key].txval = Number((b2csSummaryMap[key].txval + itmDet.txval).toFixed(2));
          b2csSummaryMap[key].iamt = Number((b2csSummaryMap[key].iamt + itmDet.iamt).toFixed(2));
          b2csSummaryMap[key].camt = Number((b2csSummaryMap[key].camt + itmDet.camt).toFixed(2));
          b2csSummaryMap[key].samt = Number((b2csSummaryMap[key].samt + itmDet.samt).toFixed(2));
          b2csSummaryMap[key].csamt = Number((b2csSummaryMap[key].csamt + (itmDet.csamt || 0)).toFixed(2));
        }
      }
    }
  }

  const b2cs = Object.values(b2csSummaryMap);
  const b2cl = Object.values(b2clMap);

  // Table 12 HSN Summary structure in GSTN schema: { data: [ { num: 1, hsn_sc, desc, uqc, qty, val, txval, iamt, camt, samt, csamt } ] }
  const hsnData = Object.values(hsnSummaryMap).map((row, idx) => ({
    num: idx + 1,
    hsn_sc: row.hsn_sc,
    desc: row.desc,
    uqc: row.uqc,
    qty: row.qty,
    val: row.val,
    txval: row.txval,
    iamt: row.iamt,
    camt: row.camt,
    samt: row.samt,
    csamt: row.csamt,
  }));

  return {
    gstin: sellerGSTIN,
    fp,
    version: "GST3.0.4",
    hash: "hash",
    b2b,
    b2cl,
    b2cs,
    hsn: {
      data: hsnData,
    },
    b2c: b2cRaw, // Kept for backwards UI compatibility
  };
}

/* ---------------- Helpers ---------------- */

export function getTaxRate(data: any): number {
  if (data.taxPercent !== undefined && data.taxPercent !== null) return Number(data.taxPercent);
  if (data.tax_rate !== undefined && data.tax_rate !== null) return Number(data.tax_rate);

  const tax = (Number(data.cgst) || 0) + (Number(data.sgst) || 0) + (Number(data.igst) || 0);
  const txval = Number(data.taxable_value) || 0;

  if (!txval || tax === 0) return 0;

  const rawRate = (tax / txval) * 100;

  // Match against statutory GST rate slabs
  const closest = STATUTORY_GST_RATES.find((r) => Math.abs(r - rawRate) < 0.15);
  if (closest !== undefined) return closest;

  return Math.round(rawRate * 100) / 100;
}

export function formatDateForGST(dateStr?: string): string {
  if (!dateStr || typeof dateStr !== "string") {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();
    return `${d}-${m}-${y}`;
  }

  const parts = dateStr.replace(/[./]/g, "-").split("-");

  // YYYY-MM-DD
  if (parts[0]?.length === 4 && parts.length >= 3) {
    return `${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}-${parts[0]}`;
  }

  // DD-MM-YYYY or DD-MM-YY
  if (parts.length >= 3) {
    const d = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    let y = parts[2];
    if (y.length === 2) y = "20" + y;
    return `${d}-${m}-${y}`;
  }

  return dateStr;
}
