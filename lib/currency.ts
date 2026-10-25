/**
 * Indian Rupee (INR) currency and numbering formatter
 * Formats numbers into standard Indian numbering system:
 * e.g., 100000 -> "₹1,00,000.00"
 */

export function formatINR(amount: number | string | null | undefined, includeSymbol: boolean = true): string {
  if (amount === null || amount === undefined || amount === "") {
    return includeSymbol ? "₹0.00" : "0.00";
  }

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return includeSymbol ? "₹0.00" : "0.00";
  }

  const formatted = num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return includeSymbol ? `₹${formatted}` : formatted;
}

export function formatNumberIN(num: number | string | null | undefined): string {
  if (num === null || num === undefined || num === "") return "0";
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(n)) return "0";
  return n.toLocaleString("en-IN");
}
