import { formatINR } from "./currency";

export interface CompactInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  placeOfSupply?: string;
  reverseCharge?: boolean;
  seller: {
    tradeName?: string;
    businessName?: string;
    gstin?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    upiId?: string;
  };
  client: {
    name?: string;
    tradeName?: string;
    gstin?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
  };
  items: Array<{
    name: string;
    hsn?: string;
    quantity: number;
    unit?: string;
    rate: number;
    discount?: number;
    discountType?: "percent" | "fixed";
    taxPercent?: number;
  }>;
  totals: {
    taxableAmount: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    cess?: number;
    roundOff?: number;
    grandTotal: number;
    isInterstate?: boolean;
  };
  qrDataUrl?: string;
}

/**
 * Encodes invoice data into a URL-safe compact string.
 */
export function encodeInvoiceForUrl(data: CompactInvoiceData): string {
  try {
    const compactPayload = {
      n: data.invoiceNumber,
      d: data.invoiceDate,
      due: data.dueDate || "",
      pos: data.placeOfSupply || "",
      rcm: !!data.reverseCharge,
      s: {
        t: data.seller.tradeName || "",
        b: data.seller.businessName || "",
        g: data.seller.gstin || "",
        p: data.seller.phone || "",
        e: data.seller.email || "",
        a: data.seller.address || "",
        c: data.seller.city || "",
        st: data.seller.state || "",
        pin: data.seller.pincode || "",
        bk: data.seller.bankName || "",
        ac: data.seller.accountNumber || "",
        if: data.seller.ifsc || "",
        u: data.seller.upiId || "",
      },
      c: {
        n: data.client.name || "",
        t: data.client.tradeName || "",
        g: data.client.gstin || "",
        p: data.client.phone || "",
        a: data.client.address || "",
        c: data.client.city || "",
        st: data.client.state || "",
      },
      it: data.items.map((it) => ({
        n: it.name,
        h: it.hsn || "",
        q: it.quantity,
        u: it.unit || "",
        r: it.rate,
        d: it.discount || 0,
        dt: it.discountType || "percent",
        t: it.taxPercent || 0,
      })),
      tot: {
        tx: data.totals.taxableAmount,
        cg: data.totals.cgst || 0,
        sg: data.totals.sgst || 0,
        ig: data.totals.igst || 0,
        cs: data.totals.cess || 0,
        ro: data.totals.roundOff || 0,
        gt: data.totals.grandTotal,
        ist: !!data.totals.isInterstate,
      },
    };

    const json = JSON.stringify(compactPayload);
    if (typeof window !== "undefined") {
      return encodeURIComponent(btoa(encodeURIComponent(json)));
    }
    return encodeURIComponent(Buffer.from(encodeURIComponent(json)).toString("base64"));
  } catch {
    return "";
  }
}

/**
 * Decodes compressed invoice data from a URL parameter.
 */
export function decodeInvoiceFromUrl(encoded: string): CompactInvoiceData | null {
  try {
    const raw = decodeURIComponent(encoded);
    const json = decodeURIComponent(
      typeof window !== "undefined"
        ? atob(raw)
        : Buffer.from(raw, "base64").toString("utf-8")
    );
    const p = JSON.parse(json);

    return {
      invoiceNumber: p.n || "Invoice",
      invoiceDate: p.d || "",
      dueDate: p.due || "",
      placeOfSupply: p.pos || "",
      reverseCharge: !!p.rcm,
      seller: {
        tradeName: p.s?.t || "",
        businessName: p.s?.b || "",
        gstin: p.s?.g || "",
        phone: p.s?.p || "",
        email: p.s?.e || "",
        address: p.s?.a || "",
        city: p.s?.c || "",
        state: p.s?.st || "",
        pincode: p.s?.pin || "",
        bankName: p.s?.bk || "",
        accountNumber: p.s?.ac || "",
        ifsc: p.s?.if || "",
        upiId: p.s?.u || "",
      },
      client: {
        name: p.c?.n || "",
        tradeName: p.c?.t || "",
        gstin: p.c?.g || "",
        phone: p.c?.p || "",
        address: p.c?.a || "",
        city: p.c?.c || "",
        state: p.c?.st || "",
      },
      items: (p.it || []).map((it: any) => ({
        name: it.n || "Item",
        hsn: it.hsn || it.h || "",
        quantity: it.q ?? 1,
        unit: it.u || "",
        rate: it.r ?? 0,
        discount: it.d ?? 0,
        discountType: it.dt || "percent",
        taxPercent: it.t ?? 0,
      })),
      totals: {
        taxableAmount: p.tot?.tx ?? 0,
        cgst: p.tot?.cg ?? 0,
        sgst: p.tot?.sg ?? 0,
        igst: p.tot?.ig ?? 0,
        cess: p.tot?.cs ?? 0,
        roundOff: p.tot?.ro ?? 0,
        grandTotal: p.tot?.gt ?? 0,
        isInterstate: !!p.tot?.ist,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Constructs the canonical public online bill URL.
 */
export function generateFullBillUrl(data: CompactInvoiceData, customBase?: string): string {
  const origin =
    customBase ||
    (typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "https://gstlens.in");
  const encoded = encodeInvoiceForUrl(data);
  const invId = encodeURIComponent(data.invoiceNumber || "bill");
  return `${origin}/invoice/view?id=${invId}&d=${encoded}`;
}

/**
 * Dynamically draws an official, compact, high-DPI (Retina) e-bill snapshot onto an HTML5 canvas.
 * Designed specifically for instant WhatsApp sharing, clipboard copying, and previewing.
 */
export async function generateCompactBillImage(
  data: CompactInvoiceData
): Promise<{ blob: Blob; dataUrl: string; file: File }> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("generateCompactBillImage must be called in a browser environment");
  }

  const width = 640;
  const itemsCount = Math.min(data.items.length, 5);
  const hasOverflow = data.items.length > 5;
  const qrSectionHeight = data.qrDataUrl || data.seller.upiId ? 116 : 0;
  const height = 370 + itemsCount * 32 + (hasOverflow ? 24 : 0) + qrSectionHeight;

  const canvas = document.createElement("canvas");
  const dpr = 2; // 2x Retina resolution
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize 2D canvas context");
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, width, height);

  // Top Accent Bar
  ctx.fillStyle = "#047857";
  ctx.fillRect(0, 0, width, 5);

  // Seller Business Header
  const sellerTitle = data.seller.tradeName || data.seller.businessName || "TAX INVOICE";
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(sellerTitle.slice(0, 36), 24, 34);

  ctx.fillStyle = "#64748B";
  ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  let sellerSub = "";
  if (data.seller.gstin) sellerSub += `GSTIN: ${data.seller.gstin}   `;
  if (data.seller.phone) sellerSub += `Tel: ${data.seller.phone}`;
  ctx.fillText(sellerSub, 24, 52);

  // Top Right "TAX INVOICE" Badge
  ctx.fillStyle = "#ECFDF5";
  ctx.beginPath();
  ctx.roundRect(width - 144, 18, 120, 24, 6);
  ctx.fill();
  ctx.strokeStyle = "#A7F3D0";
  ctx.stroke();
  ctx.fillStyle = "#047857";
  ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TAX INVOICE", width - 84, 34);
  ctx.textAlign = "left";

  // Light Particulars Box
  ctx.fillStyle = "#F8FAFC";
  ctx.beginPath();
  ctx.roundRect(24, 68, width - 48, 64, 8);
  ctx.fill();
  ctx.strokeStyle = "#E2E8F0";
  ctx.stroke();

  // Billed To (Customer)
  ctx.fillStyle = "#94A3B8";
  ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("BILLED TO", 36, 86);

  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const clientName = (data.client.name || "Cash Customer").slice(0, 32);
  ctx.fillText(clientName, 36, 102);

  ctx.fillStyle = "#64748B";
  ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const clientSub = data.client.gstin
    ? `GSTIN: ${data.client.gstin}`
    : data.client.phone
    ? `Ph: ${data.client.phone}`
    : "B2C Consumer";
  ctx.fillText(clientSub, 36, 118);

  // Invoice Particulars
  ctx.fillStyle = "#94A3B8";
  ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("INVOICE DETAILS", width - 210, 86);

  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(`No: ${data.invoiceNumber || "—"}`, width - 210, 102);

  ctx.fillStyle = "#64748B";
  ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(`Date: ${data.invoiceDate || "—"}`, width - 210, 118);

  // Table Header
  let y = 146;
  ctx.fillStyle = "#F1F5F9";
  ctx.fillRect(24, y, width - 48, 24);
  ctx.fillStyle = "#475569";
  ctx.font = "bold 9px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("ITEM DESCRIPTION", 36, y + 16);
  ctx.textAlign = "right";
  ctx.fillText("QTY", width - 180, y + 16);
  ctx.fillText("RATE", width - 106, y + 16);
  ctx.fillText("AMOUNT", width - 36, y + 16);
  ctx.textAlign = "left";

  y += 24;

  // Table Rows
  const displayItems = data.items.slice(0, 5);
  displayItems.forEach((it, idx) => {
    ctx.strokeStyle = "#F1F5F9";
    ctx.beginPath();
    ctx.moveTo(24, y + 30);
    ctx.lineTo(width - 24, y + 30);
    ctx.stroke();

    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const itemName = `${idx + 1}. ${(it.name || "Item").slice(0, 32)}`;
    ctx.fillText(itemName, 36, y + 20);

    const qty = Number(it.quantity) || 1;
    const rate = Number(it.rate) || 0;
    const disc = Number(it.discount) || 0;
    const taxable = qty * rate - (it.discountType === "percent" ? (qty * rate * disc) / 100 : disc);

    ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#475569";
    ctx.textAlign = "right";
    ctx.fillText(`${qty} ${it.unit || ""}`, width - 180, y + 20);
    ctx.fillText(`₹${rate.toFixed(0)}`, width - 106, y + 20);

    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`₹${taxable.toFixed(2)}`, width - 36, y + 20);
    ctx.textAlign = "left";

    y += 30;
  });

  if (hasOverflow) {
    ctx.fillStyle = "#94A3B8";
    ctx.font = "italic 9.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`+ ${data.items.length - 5} more items in full bill online`, 36, y + 16);
    y += 20;
  }

  // Summary Totals Card
  y += 6;
  ctx.fillStyle = "#F8FAFC";
  ctx.beginPath();
  ctx.roundRect(width - 250, y, 226, 68, 6);
  ctx.fill();
  ctx.strokeStyle = "#E2E8F0";
  ctx.stroke();

  ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#64748B";
  ctx.fillText("Taxable:", width - 238, y + 18);
  ctx.textAlign = "right";
  ctx.fillText(`₹${data.totals.taxableAmount.toFixed(2)}`, width - 36, y + 18);
  ctx.textAlign = "left";

  const totalGst = (data.totals.cgst || 0) + (data.totals.sgst || 0) + (data.totals.igst || 0);
  ctx.fillText("GST:", width - 238, y + 36);
  ctx.textAlign = "right";
  ctx.fillText(`₹${totalGst.toFixed(2)}`, width - 36, y + 36);
  ctx.textAlign = "left";

  ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#047857";
  ctx.fillText("TOTAL PAYABLE:", width - 238, y + 56);
  ctx.textAlign = "right";
  ctx.fillText(`₹${data.totals.grandTotal.toFixed(2)}`, width - 36, y + 56);
  ctx.textAlign = "left";

  // UPI QR Code & Payment Section
  y += 82;
  if (data.qrDataUrl || data.seller.upiId) {
    ctx.fillStyle = "#F0FDF4";
    ctx.beginPath();
    ctx.roundRect(24, y, width - 48, 92, 8);
    ctx.fill();
    ctx.strokeStyle = "#BBF7D0";
    ctx.stroke();

    if (data.qrDataUrl) {
      try {
        const qrImg = new Image();
        qrImg.src = data.qrDataUrl;
        await new Promise((resolve) => {
          if (qrImg.complete) resolve(true);
          else {
            qrImg.onload = () => resolve(true);
            qrImg.onerror = () => resolve(false);
          }
        });
        ctx.drawImage(qrImg, 36, y + 8, 76, 76);
      } catch {}
    }

    const qrTextX = data.qrDataUrl ? 124 : 38;
    ctx.fillStyle = "#047857";
    ctx.font = "bold 11.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Scan & Pay via UPI (GPay / PhonePe / Paytm / BHIM)", qrTextX, y + 28);

    ctx.fillStyle = "#166534";
    ctx.font = "11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    if (data.seller.upiId) {
      ctx.fillText(`UPI ID: ${data.seller.upiId}`, qrTextX, y + 48);
    }
    ctx.fillStyle = "#4B5563";
    ctx.font = "10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(`Instant verified settlement for ₹${data.totals.grandTotal.toFixed(2)}`, qrTextX, y + 68);

    y += 104;
  }

  // Footer Watermark
  ctx.fillStyle = "#94A3B8";
  ctx.font = "9.5px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Compliance & Billing powered by GSTLens.in • Rule 46 Compliant Tax Invoice", width / 2, y + 10);

  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), "image/png");
  });
  const file = new File([blob], `invoice-${data.invoiceNumber || "bill"}.png`, { type: "image/png" });

  return { blob, dataUrl, file };
}
