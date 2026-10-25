type Invoice = any;

export function generateGSTR1JSON(
  sellerGSTIN: string,
  fp: string, // filing period e.g. "082025"
  invoices: Invoice[]
) {
  const b2b: any[] = [];
  const b2cRaw: any[] = [];
  const b2csSummaryMap: Record<string, any> = {};

  const sellerState = sellerGSTIN ? sellerGSTIN.slice(0, 2) : "07";

  for (const inv of invoices) {
    const data = inv.data || {};
    const pos = data.pos || (data.seller_gstin ? data.seller_gstin.slice(0, 2) : sellerState);
    const rt = getTaxRate(data);
    const txval = Number((data.taxable_value || 0).toFixed(2));
    const igst = Number((data.igst || 0).toFixed(2));
    const cgst = Number((data.cgst || 0).toFixed(2));
    const sgst = Number((data.sgst || 0).toFixed(2));
    const total = Number((data.invoice_total || 0).toFixed(2));

    const invoiceItem = {
      inum: String(data.invoice_number || "").trim(),
      idt: formatDateForGST(data.invoice_date),
      val: total,
      pos,
      rchrg: "N",
      inv_typ: "R",
      itms: [
        {
          num: 1,
          itm_det: {
            txval,
            rt,
            iamt: igst,
            camt: cgst,
            samt: sgst,
            csamt: 0,
          },
        },
      ],
    };

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

      buyer.inv.push(invoiceItem);
    } else {
      b2cRaw.push(invoiceItem);

      // Group B2C into B2CS (B2C Small) compliant summary by POS + Rate
      const sply_ty = pos === sellerState ? "INTRA" : "INTER";
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

      b2csSummaryMap[key].txval = Number((b2csSummaryMap[key].txval + txval).toFixed(2));
      b2csSummaryMap[key].iamt = Number((b2csSummaryMap[key].iamt + igst).toFixed(2));
      b2csSummaryMap[key].camt = Number((b2csSummaryMap[key].camt + cgst).toFixed(2));
      b2csSummaryMap[key].samt = Number((b2csSummaryMap[key].samt + sgst).toFixed(2));
    }
  }

  const b2cs = Object.values(b2csSummaryMap);

  return {
    gstin: sellerGSTIN,
    fp,
    version: "GST3.0.4",
    hash: "hash",
    b2b,
    b2cs,
    b2c: b2cRaw, // Kept for backwards UI compatibility
  };
}

/* ---------------- Helpers ---------------- */

function getTaxRate(data: any): number {
  const tax = (data.cgst || 0) + (data.sgst || 0) + (data.igst || 0);

  if (!data.taxable_value || tax === 0) return 0;

  return Math.round((tax / data.taxable_value) * 100);
}

function formatDateForGST(dateStr?: string): string {
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
