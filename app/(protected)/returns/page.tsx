"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ReturnsRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  useEffect(() => {
    if (tab === "gstr1") {
      router.replace("/gstr-1");
    } else if (tab === "gstr3b") {
      router.replace("/gstr-3b");
    } else {
      router.replace("/gstr-2b");
    }
  }, [router, tab]);

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function ReturnsRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fafaf9] dark:bg-[#141415] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#047857] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ReturnsRedirectContent />
    </Suspense>
  );
}
