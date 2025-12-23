type Invoice = any;

export function generateGSTR1JSON(
  sellerGSTIN: string,
  fp: string, // filing period e.g. "082025"
  invoices: Invoice[]
) {
  const b2b: any[] = [];
  const b2c: any[] = [];

  for (const inv of invoices) {
    const data = inv.data;

    const invoiceItem = {
      inum: data.invoice_number,
      idt: data.invoice_date,
      val: data.invoice_total,
      pos: data.pos,
      itms: [
        {
          txval: data.taxable_value,
          rt: getTaxRate(data),
          igst: data.igst || 0,
          cgst: data.cgst || 0,
          sgst: data.sgst || 0,
        },
      ],
    };

    if (data.invoice_type === "B2B" && data.buyer_gstin) {
      let buyer = b2b.find((b) => b.ctin === data.buyer_gstin);

      if (!buyer) {
        buyer = {
          ctin: data.buyer_gstin,
          inv: [],
        };
        b2b.push(buyer);
      }

      buyer.inv.push(invoiceItem);
    } else {
      b2c.push(invoiceItem);
    }
  }

  return {
    gstin: sellerGSTIN,
    fp,
    version: "GST1.0",
    b2b,
    b2c,
  };
}

/* ---------------- Helpers ---------------- */

function getTaxRate(data: any): number {
  const tax = (data.cgst || 0) + (data.sgst || 0) + (data.igst || 0);

  if (!data.taxable_value || tax === 0) return 0;

  return Math.round((tax / data.taxable_value) * 100);
}
