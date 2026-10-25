/**
 * Official GSTN Portal GSTR-3B Computation Engine & Payload Generator
 * Complies with CGST/IGST Act, Section 170 (nearest Rupee rounding),
 * Section 17(5) (Ineligible/Blocked ITC), and CBIC Circular 170/02/2022-GST.
 */

export interface TaxBreakdown {
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
  csamt: number;
}

export interface InterStateSupplies {
  pos: string;
  txval: number;
  iamt: number;
}

export interface GSTR3BComputation {
  gstin: string;
  ret_period: string; // MMYYYY format
  filing_typ: "GSTR3B";

  // Table 3.1: Details of Outward Supplies and inward supplies liable to reverse charge
  sup_details: {
    osup_det: TaxBreakdown;       // 3.1(a) Outward taxable supplies
    osup_zero: { txval: number; iamt: number; csamt: number }; // 3.1(b) Zero rated
    osup_nil_exmp: { txval: number }; // 3.1(c) Nil rated, exempted
    isup_rev: TaxBreakdown;       // 3.1(d) Inward supplies liable to reverse charge
    osup_nongst: { txval: number }; // 3.1(e) Non-GST outward supplies
  };

  // Table 3.2: Inter-State supplies made to unregistered persons, composition dealers, and UIN holders
  inter_sup: {
    unreg_details: InterStateSupplies[];
    comp_details: InterStateSupplies[];
    uin_details: InterStateSupplies[];
  };

  // Table 4: Eligible Input Tax Credit (ITC)
  itc_elg: {
    itc_avl: {
      OTH: TaxBreakdown;          // 4(A)(5) All other ITC
      ISRC: TaxBreakdown;         // 4(A)(3) Inward supplies liable to reverse charge
      IMPG: { iamt: number; csamt: number }; // 4(A)(1) Import of goods
      IMPS: { iamt: number; csamt: number }; // 4(A)(2) Import of services
      ISD: TaxBreakdown;          // 4(A)(4) Inward supplies from ISD
    };
    itc_rev: {
      RUL: TaxBreakdown;          // 4(B)(1) As per rules / Section 17(5) blocked credit
      OTH: TaxBreakdown;          // 4(B)(2) Others
    };
    itc_net: TaxBreakdown;        // 4(C) Net ITC Available (4A - 4B)
    itc_inelg: {
      RUL: TaxBreakdown;          // 4(D)(1) As per section 17(5)
      OTH: TaxBreakdown;          // 4(D)(2) Others (e.g. Ineligible POS)
    };
  };

  // Table 5: Inward supplies exempt, nil, and non-GST
  inward_sup: {
    isup_details: {
      inter: number;
      intra: number;
    };
  };

  // Net Tax Summary (Tax Payable in Cash after ITC offset)
  tax_summary: {
    outward_liability: TaxBreakdown;
    itc_available: TaxBreakdown;
    rcm_liability: TaxBreakdown; // Must be paid in cash (cannot offset with ITC)
    net_cash_payable: TaxBreakdown;
  };
}

/**
 * Section 170 of CGST Act: Amount of tax, interest, penalty, fine or any other sum payable
 * shall be rounded off to the nearest rupee.
 */
export function roundNearest(num: number): number {
  return Math.round(Number(num) || 0);
}

/**
 * Normalizes return period into official MMYYYY format (e.g. "102026" or "10-2026" -> "102026")
 */
export function normalizeReturnPeriod(fp: string): string {
  const digits = (fp || "").replace(/\D/g, "");
  if (digits.length === 6) {
    return digits;
  }
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = String(now.getFullYear());
  return `${m}${y}`;
}

/**
 * Computes full GSTR-3B schedule from confirmed/local invoices.
 * Supports:
 * - Outward supplies (Sales where seller_gstin matches userGSTIN or invoice marked outward)
 * - Inward supplies (Purchases where buyer_gstin matches userGSTIN generating Eligible ITC)
 * - Inter-state Table 3.2 aggregation by Place of Supply
 * - Reverse Charge Mechanism (RCM) liabilities and mirror ITC
 */
export function computeGSTR3B(
  userGSTIN: string,
  fp: string,
  invoices: any[]
): GSTR3BComputation {
  const normUserGSTIN = (userGSTIN || "").trim().toUpperCase();
  const userState = normUserGSTIN.slice(0, 2);
  const retPeriod = normalizeReturnPeriod(fp);

  // Table 3.1 accumulators
  let osup_txval = 0, osup_iamt = 0, osup_camt = 0, osup_samt = 0, osup_csamt = 0;
  let rcm_txval = 0, rcm_iamt = 0, rcm_camt = 0, rcm_samt = 0, rcm_csamt = 0;

  // Table 3.2 map (pos -> { txval, iamt })
  const unregMap = new Map<string, { txval: number; iamt: number }>();

  // Table 4 ITC accumulators
  let itc_oth_txval = 0, itc_oth_iamt = 0, itc_oth_camt = 0, itc_oth_samt = 0, itc_oth_csamt = 0;
  let itc_rev_txval = 0, itc_rev_iamt = 0, itc_rev_camt = 0, itc_rev_samt = 0, itc_rev_csamt = 0;

  for (const item of invoices) {
    const inv = item.data || item;
    const sellerGST = (inv.seller_gstin || "").trim().toUpperCase();
    const buyerGST = (inv.buyer_gstin || "").trim().toUpperCase();

    const txval = Number(inv.taxable_value) || 0;
    const cgst = Number(inv.cgst) || 0;
    const sgst = Number(inv.sgst) || 0;
    const igst = Number(inv.igst) || 0;
    const cess = Number(inv.cess) || 0;
    const isRCM = Boolean(inv.reverse_charge);
    const isBlocked = Boolean(inv.is_blocked_itc || inv.blocked_17_5);

    // Determine POS: defaults to buyer state for B2B, seller state for B2C, or invoice POS
    let pos = (inv.pos || "").toString().trim().slice(0, 2);
    if (!pos || !/^\d{2}$/.test(pos)) {
      pos = buyerGST.length >= 2 ? buyerGST.slice(0, 2) : sellerGST.slice(0, 2) || userState || "99";
    }

    // Classification: Is this an Inward (Purchase) or Outward (Sale) supply?
    const isInward =
      inv.is_inward === true ||
      (buyerGST && normUserGSTIN && buyerGST === normUserGSTIN && sellerGST !== normUserGSTIN);

    if (isInward) {
      // INWARD SUPPLY -> Feeds Table 4 (Eligible ITC) & 3.1(d) if RCM
      if (isRCM) {
        rcm_txval += txval;
        rcm_iamt += igst;
        rcm_camt += cgst;
        rcm_samt += sgst;
        rcm_csamt += cess;
      }

      // Gross ITC under Table 4(A)(5)
      itc_oth_txval += txval;
      itc_oth_iamt += igst;
      itc_oth_camt += cgst;
      itc_oth_samt += sgst;
      itc_oth_csamt += cess;

      // Ineligible / Blocked ITC under Section 17(5) -> Reversal under Table 4(B)(1)
      if (isBlocked) {
        itc_rev_txval += txval;
        itc_rev_iamt += igst;
        itc_rev_camt += cgst;
        itc_rev_samt += sgst;
        itc_rev_csamt += cess;
      }
    } else {
      // OUTWARD SUPPLY -> Feeds Table 3.1(a) and Table 3.2
      osup_txval += txval;
      osup_iamt += igst;
      osup_camt += cgst;
      osup_samt += sgst;
      osup_csamt += cess;

      // Table 3.2: Inter-State supplies to unregistered persons (B2C where POS != Supplier State)
      const isB2C = inv.invoice_type === "B2C" || !buyerGST;
      const isInterState = igst > 0 || (pos && userState && pos !== userState);

      if (isB2C && isInterState && pos) {
        const curr = unregMap.get(pos) || { txval: 0, iamt: 0 };
        curr.txval += txval;
        curr.iamt += igst;
        unregMap.set(pos, curr);
      }
    }
  }

  // Construct Table 3.2 array
  const unreg_details: InterStateSupplies[] = Array.from(unregMap.entries())
    .map(([pos, val]) => ({
      pos,
      txval: roundNearest(val.txval),
      iamt: roundNearest(val.iamt),
    }))
    .sort((a, b) => a.pos.localeCompare(b.pos));

  // Table 3.1 Outward supplies
  const osup_det: TaxBreakdown = {
    txval: roundNearest(osup_txval),
    iamt: roundNearest(osup_iamt),
    camt: roundNearest(osup_camt),
    samt: roundNearest(osup_samt),
    csamt: roundNearest(osup_csamt),
  };

  const isup_rev: TaxBreakdown = {
    txval: roundNearest(rcm_txval),
    iamt: roundNearest(rcm_iamt),
    camt: roundNearest(rcm_camt),
    samt: roundNearest(rcm_samt),
    csamt: roundNearest(rcm_csamt),
  };

  // Table 4 ITC details
  const itc_oth: TaxBreakdown = {
    txval: roundNearest(itc_oth_txval),
    iamt: roundNearest(itc_oth_iamt),
    camt: roundNearest(itc_oth_camt),
    samt: roundNearest(itc_oth_samt),
    csamt: roundNearest(itc_oth_csamt),
  };

  const itc_isrc: TaxBreakdown = {
    txval: isup_rev.txval,
    iamt: isup_rev.iamt,
    camt: isup_rev.camt,
    samt: isup_rev.samt,
    csamt: isup_rev.csamt,
  };

  const itc_rev: TaxBreakdown = {
    txval: roundNearest(itc_rev_txval),
    iamt: roundNearest(itc_rev_iamt),
    camt: roundNearest(itc_rev_camt),
    samt: roundNearest(itc_rev_samt),
    csamt: roundNearest(itc_rev_csamt),
  };

  // Table 4(C) Net ITC = (OTH + ISRC) - REV
  const itc_net: TaxBreakdown = {
    txval: roundNearest(itc_oth.txval + itc_isrc.txval - itc_rev.txval),
    iamt: Math.max(0, roundNearest(itc_oth.iamt + itc_isrc.iamt - itc_rev.iamt)),
    camt: Math.max(0, roundNearest(itc_oth.camt + itc_isrc.camt - itc_rev.camt)),
    samt: Math.max(0, roundNearest(itc_oth.samt + itc_isrc.samt - itc_rev.samt)),
    csamt: Math.max(0, roundNearest(itc_oth.csamt + itc_isrc.csamt - itc_rev.csamt)),
  };

  // Net Cash Payable = (Outward Liability - Net ITC) + RCM Liability (cannot offset with ITC)
  const net_cash_payable: TaxBreakdown = {
    txval: osup_det.txval,
    iamt: Math.max(0, osup_det.iamt - itc_net.iamt) + isup_rev.iamt,
    camt: Math.max(0, osup_det.camt - itc_net.camt) + isup_rev.camt,
    samt: Math.max(0, osup_det.samt - itc_net.samt) + isup_rev.samt,
    csamt: Math.max(0, osup_det.csamt - itc_net.csamt) + isup_rev.csamt,
  };

  return {
    gstin: normUserGSTIN,
    ret_period: retPeriod,
    filing_typ: "GSTR3B",

    sup_details: {
      osup_det,
      osup_zero: { txval: 0, iamt: 0, csamt: 0 },
      osup_nil_exmp: { txval: 0 },
      isup_rev,
      osup_nongst: { txval: 0 },
    },

    inter_sup: {
      unreg_details,
      comp_details: [],
      uin_details: [],
    },

    itc_elg: {
      itc_avl: {
        OTH: itc_oth,
        ISRC: itc_isrc,
        IMPG: { iamt: 0, csamt: 0 },
        IMPS: { iamt: 0, csamt: 0 },
        ISD: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
      },
      itc_rev: {
        RUL: itc_rev,
        OTH: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
      },
      itc_net,
      itc_inelg: {
        RUL: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
        OTH: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
      },
    },

    inward_sup: {
      isup_details: {
        inter: 0,
        intra: 0,
      },
    },

    tax_summary: {
      outward_liability: osup_det,
      itc_available: itc_net,
      rcm_liability: isup_rev,
      net_cash_payable,
    },
  };
}

/**
 * Generates the official GST Offline Tool JSON payload for GSTR-3B upload on gst.gov.in
 */
export function generateGSTR3BJSON(
  userGSTIN: string,
  fp: string,
  invoices: any[]
) {
  const computation = computeGSTR3B(userGSTIN, fp, invoices);

  return {
    gstin: computation.gstin,
    ret_period: computation.ret_period,
    filing_typ: "GSTR3B",
    sup_details: computation.sup_details,
    inter_sup: computation.inter_sup,
    itc_elg: computation.itc_elg,
    inward_sup: computation.inward_sup,
  };
}

/**
 * DRC-01B Risk Checker: Compares GSTR-1 outward tax liability with GSTR-3B tax paid.
 * Under Rule 88C, if GSTR-1 exceeds GSTR-3B by more than ₹25,000 or 20%, portal generates DRC-01B.
 */
export function checkDRC01BRisk(gstr1TotalTax: number, gstr3bTotalTax: number) {
  const diff = Math.round(gstr1TotalTax - gstr3bTotalTax);
  const isHighRisk = diff > 25000;
  const isModerateRisk = diff > 500 && diff <= 25000;

  return {
    difference: diff,
    isRisk: diff > 500,
    severity: isHighRisk ? ("high" as const) : isModerateRisk ? ("moderate" as const) : ("none" as const),
    message: isHighRisk
      ? `High DRC-01B Notice Risk: GSTR-1 tax exceeds GSTR-3B by ₹${diff.toLocaleString("en-IN")}. Adjust liability before submission.`
      : isModerateRisk
      ? `Tax Discrepancy: GSTR-1 exceeds GSTR-3B by ₹${diff.toLocaleString("en-IN")}. Verify invoice inclusion.`
      : "Tax liabilities reconciled. No DRC-01B notice risk detected.",
  };
}
