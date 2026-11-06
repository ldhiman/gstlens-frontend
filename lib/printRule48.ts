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
 * - Eco-Saver Mode (Paper Loss Reduction):
 *     Dual 2-in-1 copy (Original + Duplicate on 1 A4 sheet) for small item counts.
 */

export type Rule48CopyType = "original" | "duplicate" | "triplicate" | "all" | "eco-dual";

export interface Rule48BadgeInfo {
  badge: string;
  sub: string;
  color: string;
}

export const RULE_48_COPIES: { id: Rule48CopyType; title: string; subtitle: string; label: string }[] = [
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
    label: "ALL 3 COPIES",
  },
  {
    id: "eco-dual",
    title: "2-in-1 Eco-Saver (2 Copies on 1 A4)",
    subtitle: "Original + Duplicate on 1 Single A4 Sheet (50% Paper Saved)",
    label: "2-IN-1 ECO-SAVER",
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
    case "original":
    default:
      return {
        badge: "ORIGINAL FOR RECIPIENT",
        sub: "(Under Rule 48(1)(a) of CGST Rules, 2017)",
        color: "text-blue-800 bg-blue-50 border-blue-300",
      };
  }
}
