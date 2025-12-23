"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedLayout({ children }: any) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !userProfile?.primary_gstin) {
      router.replace("/profile?setup=1");
    }
  }, [loading, user, userProfile]);

  if (loading) return null;

  return children;
}
