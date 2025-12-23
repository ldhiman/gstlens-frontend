type Invoice = {
  data: any;
};

export function generateGSTR3BJSON(
  sellerGSTIN: string,
  fp: string,
  invoices: Invoice[]
) {
  let txval = 0;
  let igst = 0;
  let cgst = 0;
  let sgst = 0;

  for (const inv of invoices) {
    const d = inv.data;

    txval += d.taxable_value || 0;
    igst += d.igst || 0;
    cgst += d.cgst || 0;
    sgst += d.sgst || 0;
  }

  return {
    gstin: sellerGSTIN,
    fp,
    version: "GST3B-1.0",

    sup_details: {
      osup_det: {
        txval: round(txval),
        igst: round(igst),
        cgst: round(cgst),
        sgst: round(sgst),
        cess: 0,
      },
    },

    tax_payable: {
      igst: round(igst),
      cgst: round(cgst),
      sgst: round(sgst),
      cess: 0,
    },
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
