"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function ProfileRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const setup = searchParams.get("setup");
    const require = searchParams.get("require");

    if (setup === "1" || require === "gstin") {
      router.replace("/settings?tab=profile");
    } else {
      router.replace("/settings?tab=account");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#141415] text-stone-900 dark:text-stone-100">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#047857] mx-auto" />
        <p className="text-xs font-medium text-stone-500">Redirecting to Settings & Account...</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#141415]">
          <Loader2 className="w-8 h-8 animate-spin text-[#047857]" />
        </div>
      }
    >
      <ProfileRedirectContent />
    </Suspense>
  );
}
