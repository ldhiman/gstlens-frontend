"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InvoiceGenerator from "@/components/InvoiceGenerator";
import { Header } from "@/components/header";
import { getInvoiceById } from "@/lib/storage";
import { normalizeDocType } from "@/lib/gstBillingEngine";
import toast from "react-hot-toast";

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit") || searchParams.get("id");

  const [loading, setLoading] = useState<boolean>(Boolean(editId));
  const [initialData, setInitialData] = useState<any>(null);

  useEffect(() => {
    if (!editId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const inv = await getInvoiceById(editId);
        if (!inv || inv.deleted === 1) {
          toast.error("Invoice not found or has been deleted.");
          router.replace("/invoices");
          return;
        }

        const raw = inv.data || inv;
        setInitialData({
          id: inv.id,
          _local_id: inv.id,
          invoice_type: normalizeDocType(raw.invoice_type || raw.docType),
          docType: normalizeDocType(raw.invoice_type || raw.docType),
          invoice_number: raw.invoice_number,
          invoiceNumber: raw.invoice_number,
          invoice_date: raw.invoice_date,
          invoiceDate: raw.invoice_date,
          due_date: raw.due_date,
          dueDate: raw.due_date,
          client: raw.buyer || raw.client || {},
          buyer: raw.buyer || raw.client || {},
          items: raw.items || [],
          place_of_supply: raw.place_of_supply,
          placeOfSupply: raw.place_of_supply,
          reverse_charge: raw.reverse_charge ?? false,
          reverseCharge: raw.reverse_charge ?? false,
          eway_bill_no: raw.eway_bill_no || "",
          eWayBillNo: raw.eway_bill_no || "",
          vehicle_no: raw.vehicle_no || "",
          vehicleNo: raw.vehicle_no || "",
          po_number: raw.po_number || "",
          poNumber: raw.po_number || "",
          shipping_charge: raw.shipping_charge ?? 0,
          shippingCharge: raw.shipping_charge ?? 0,
          terms: raw.terms || "",
          notes: raw.notes || "",
          created_at: raw.created_at || inv.created_at,
        });
      } catch (err: any) {
        toast.error("Failed to load invoice: " + err.message);
        router.replace("/invoices");
      } finally {
        setLoading(false);
      }
    })();
  }, [editId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-stone-500">Loading invoice for editing...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] text-stone-900 dark:text-stone-100 pb-20">
      <Header />
      <InvoiceGenerator
        initialData={initialData}
        onSaveSuccess={() => router.push("/invoices")}
        onCancel={() => router.push("/invoices")}
      />
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <NewInvoiceContent />
    </Suspense>
  );
}
