"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";
import OnboardingTour from "@/components/OnboardingTour";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (!userProfile?.primary_gstin) {
        router.replace("/profile?setup=1");
      }
    }
  }, [loading, user, userProfile, router]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0">
      <main className="flex-1">{children}</main>
      <BottomNav />
      <OnboardingTour />
    </div>
  );
}
