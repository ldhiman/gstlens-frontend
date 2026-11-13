/**
 * GST Rule 48 Statutory Invoice Printing & Copy Management
 * Under Rule 48 of the Central Goods and Services Tax (CGST) Rules, 2017:
 * - Supply of Goods (Triplicate):
 *     1. Original for Recipient (Rule 48(1)(a))
 *     2. Duplicate for Transporter (Rule 48(1)(b))
 *     3. Triplicate for Supplier (Rule 48(1)(c))
 * - Supply of Services (Duplicate):
 *     1. Original for Recipient (Rule 48(2)(a))
 *     2. Duplicate for Supplier (Rule 48(2)(b))
 * - Eco-Saver Modes (Paper Loss Reduction):
 *     - Dual 2-in-1: Original + Duplicate on 1 A4 sheet (50% Paper Saved)
 *     - Triple 3-in-1: Original + Duplicate + Triplicate on 1 A4 sheet (67% Paper Saved)
 *     - Smart 3-in-2: Sheet 1: Original | Sheet 2: Duplicate + Triplicate (33% Paper Saved)
 */

export type Rule48CopyType =
  | "original"
  | "duplicate"
  | "triplicate"
  | "all"
  | "eco-dual"
  | "eco-triple"
  | "eco-3in2";

export interface Rule48BadgeInfo {
  badge: string;
  sub: string;
  color: string;
}

export const RULE_48_COPIES: {
  id: Rule48CopyType;
  title: string;
  subtitle: string;
  label: string;
  savings?: string;
  recommendedMaxItems?: number;
}[] = [
  {
    id: "original",
    title: "Original for Recipient",
    subtitle: "For Buyer's Tax Credit (ITC)",
    label: "ORIGINAL FOR RECIPIENT",
  },
  {
    id: "duplicate",
    title: "Duplicate for Transporter",
    subtitle: "Carried with Goods During Movement",
    label: "DUPLICATE FOR TRANSPORTER",
  },
  {
    id: "triplicate",
    title: "Triplicate for Supplier",
    subtitle: "Retained by Supplier for Accounts",
    label: "TRIPLICATE FOR SUPPLIER",
  },
  {
    id: "all",
    title: "All 3 Copies (Rule 48 Triplicate)",
    subtitle: "Print 3 Clean Pages (Original + Duplicate + Triplicate)",
    label: "ALL 3 COPIES (3 PAGES)",
  },
  {
    id: "eco-dual",
    title: "2-in-1 Eco-Saver (2 Copies on 1 A4)",
    subtitle: "Original + Duplicate on 1 Single A4 Sheet",
    label: "2-IN-1 ECO-SAVER",
    savings: "50% Paper Saved",
    recommendedMaxItems: 6,
  },
  {
    id: "eco-triple",
    title: "3-in-1 Eco-Saver (3 Copies on 1 A4)",
    subtitle: "Original + Duplicate + Triplicate on 1 Single A4 Sheet",
    label: "3-IN-1 ECO-SAVER",
    savings: "67% Paper Saved",
    recommendedMaxItems: 4,
  },
  {
    id: "eco-3in2",
    title: "3-in-2 Eco-Saver (3 Copies on 2 A4)",
    subtitle: "Sheet 1: Full Original | Sheet 2: Duplicate + Triplicate",
    label: "3-IN-2 ECO-SAVER",
    savings: "33% Paper Saved",
    recommendedMaxItems: 8,
  },
];

export function getRule48CopyBadge(copy: Rule48CopyType): Rule48BadgeInfo {
  switch (copy) {
    case "duplicate":
      return {
        badge: "DUPLICATE FOR TRANSPORTER",
        sub: "(Under Rule 48(1)(b) of CGST Rules, 2017)",
        color: "text-amber-800 bg-amber-50 border-amber-300",
      };
    case "triplicate":
      return {
        badge: "TRIPLICATE FOR SUPPLIER",
        sub: "(Under Rule 48(1)(c) of CGST Rules, 2017)",
        color: "text-purple-800 bg-purple-50 border-purple-300",
      };
    case "eco-dual":
      return {
        badge: "ORIGINAL / DUPLICATE (2-IN-1)",
        sub: "(Rule 48 Dual Copy — Eco-Saver)",
        color: "text-emerald-800 bg-emerald-50 border-emerald-300",
      };
    case "eco-triple":
      return {
        badge: "ORIGINAL / DUPLICATE / TRIPLICATE (3-IN-1)",
        sub: "(Rule 48 Triplicate Copy — 3-in-1 Eco-Saver)",
        color: "text-emerald-800 bg-emerald-50 border-emerald-300",
      };
    case "eco-3in2":
      return {
        badge: "RULE 48 TRIPLICATE (3-IN-2)",
        sub: "(Rule 48 Triplicate Copy — 3-in-2 Eco-Saver)",
        color: "text-teal-800 bg-teal-50 border-teal-300",
      };
    case "original":
    default:
      return {
        badge: "ORIGINAL FOR RECIPIENT",
        sub: "(Under Rule 48(1)(a) of CGST Rules, 2017)",
        color: "text-blue-800 bg-blue-50 border-blue-300",
      };
  }
}

export interface PrintEligibility {
  can3in1: boolean;
  can3in2: boolean;
  can2in1: boolean;
  reason3in1: string;
  reason3in2: string;
}

/**
 * Checks whether an invoice is eligible for eco-saver compact layouts based on
 * the number of line items and layout footprint.
 */
export function checkPrintEligibility(
  itemCount: number,
  hasTerms: boolean = true
): PrintEligibility {
  const can3in1 = itemCount <= 3 || (itemCount <= 4 && !hasTerms);
  const can3in2 = itemCount <= 8;
  const can2in1 = itemCount <= 6;

  return {
    can3in1,
    can3in2,
    can2in1,
    reason3in1: can3in1
      ? `Eligible for 3-in-1 (${itemCount} items): fits all 3 copies on 1 A4 sheet, saving 67% paper`
      : `Invoice has ${itemCount} items; recommended max is 3 items for 3-in-1. Use 3-in-2 instead.`,
    reason3in2: can3in2
      ? `Eligible for 3-in-2 (${itemCount} items): prints all 3 copies across 2 A4 sheets, saving 33% paper`
      : `Invoice has ${itemCount} items; standard 3-page Triplicate recommended.`,
  };
}
