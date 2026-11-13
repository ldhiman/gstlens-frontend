"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { UPDATE_CREDIT_EVENT } from "@/lib/constants";
import { getBusinessProfile, getAllInvoices } from "@/lib/storage";
import { seedSandboxData } from "@/lib/sandboxData";

interface AuthContextType {
  user: any;
  userProfile: any;
  loading: boolean;
  isOnline: boolean;
  isOfflineMode: boolean;
  isSandboxMode: boolean;
  enterOfflineMode: () => Promise<void>;
  enterSandboxMode: () => Promise<void>;
  exitOfflineMode: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isOnline: true,
  isOfflineMode: false,
  isSandboxMode: false,
  enterOfflineMode: async () => {},
  enterSandboxMode: async () => {},
  exitOfflineMode: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gstlens_offline_mode") === "true";
    }
    return false;
  });
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("gstlens_sandbox_mode") === "true";
    }
    return false;
  });

  // Helper to load offline profile from browser IndexedDB
  const setupOfflineUser = useCallback(async () => {
    try {
      const localProfile = await getBusinessProfile();
      const offlineUserObj = {
        uid: "offline-local-user",
        displayName: localProfile.businessName || "Offline Local Business",
        email: localProfile.email || "local@gstlens.offline",
        isOffline: true,
      };

      const offlineProfileObj = {
        primary_gstin: localProfile.gstin || "27AABCU9603R1ZM",
        business_name: localProfile.businessName || "Offline Business",
        is_offline: true,
        credits: 9999, // Unrestricted local billing in offline mode
      };

      setUser(offlineUserObj);
      setUserProfile(offlineProfileObj);
      setIsOfflineMode(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("gstlens_offline_mode", "true");
      }
    } catch (err) {
      console.warn("Failed to load local business profile for offline mode:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const enterOfflineMode = useCallback(async () => {
    await setupOfflineUser();
  }, [setupOfflineUser]);

  const enterSandboxMode = useCallback(async () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gstlens_sandbox_mode", "true");
      localStorage.setItem("gstlens_offline_mode", "true");
    }
    setIsSandboxMode(true);
    // If no invoices exist in local DB, seed realistic sandbox demo bills
    const existingInvoices = await getAllInvoices().catch(() => []);
    if (existingInvoices.length === 0) {
      await seedSandboxData().catch((err) => console.warn("Failed to seed sandbox data:", err));
    }
    await setupOfflineUser();
  }, [setupOfflineUser]);

  const exitOfflineMode = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("gstlens_offline_mode");
      localStorage.removeItem("gstlens_sandbox_mode");
    }
    setIsOfflineMode(false);
    setIsSandboxMode(false);
    // If user was offline placeholder, clear to trigger online auth check
    if (user?.isOffline) {
      setUser(null);
      setUserProfile(null);
    }
  }, [user]);

  // Online / Offline window network event listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log("[Network] Connection restored: ONLINE");
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log("[Network] Connection lost: OFFLINE");
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Firebase auth state listener with offline resilience
  useEffect(() => {
    // If user is currently offline or has explicit offline mode flag set
    if (!navigator.onLine || isOfflineMode || isSandboxMode) {
      setupOfflineUser();
      return;
    }

    let isMounted = true;
    let liveProfileUnsub: (() => void) | null = null;

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (liveProfileUnsub) {
        liveProfileUnsub();
        liveProfileUnsub = null;
      }

      if (!firebaseUser) {
        // If offline mode is enabled in localStorage or offline, fallback
        if (
          localStorage.getItem("gstlens_offline_mode") === "true" ||
          localStorage.getItem("gstlens_sandbox_mode") === "true" ||
          !navigator.onLine
        ) {
          await setupOfflineUser();
        } else {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
        }
        return;
      }

      setUser(firebaseUser);

      // 1. Setup real-time listener for user profile in Firestore
      try {
        liveProfileUnsub = onSnapshot(
          doc(db, "users", firebaseUser.uid),
          (docSnap) => {
            if (isMounted && docSnap.exists()) {
              setUserProfile(docSnap.data());
              setLoading(false);
            }
          },
          (err) => {
            console.warn("Firestore onSnapshot error:", err);
          }
        );
      } catch (err) {
        console.warn("Failed to attach profile onSnapshot:", err);
      }

      // 2. Attempt initial load with timeout fallback
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Firestore timeout")), 2500)
        );

        const fetchDocPromise = (async () => {
          const ref = doc(db, "users", firebaseUser.uid);
          return await getDoc(ref);
        })();

        const snap: any = await Promise.race([fetchDocPromise, timeoutPromise]);

        if (snap && snap.exists && snap.exists()) {
          setUserProfile(snap.data());
        } else {
          // If no cloud profile, seed with local IndexedDB profile
          const localProfile = await getBusinessProfile();
          setUserProfile({
            primary_gstin: localProfile.gstin || null,
            business_name: localProfile.businessName || null,
          });
        }
      } catch (err) {
        console.warn("Firestore unreachable or timed out; falling back to local profile:", err);
        const localProfile = await getBusinessProfile();
        setUserProfile({
          primary_gstin: localProfile.gstin || "27AABCU9603R1ZM",
          business_name: localProfile.businessName || "Offline Business",
          is_offline: true,
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      if (liveProfileUnsub) liveProfileUnsub();
      unsub();
    };
  }, [isOfflineMode, isSandboxMode, setupOfflineUser]);

  // Handle custom credit update event
  const handleCreditUpdate = useCallback(async () => {
    if (!user || user.isOffline) return;

    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const newProfile = snap.data();
        setUserProfile((prev: any) => {
          if (JSON.stringify(prev) === JSON.stringify(newProfile)) return prev;
          return { ...newProfile };
        });
      }
    } catch (error) {
      console.warn("Failed to refresh user profile after credit update:", error);
    }
  }, [user]);

  useEffect(() => {
    window.addEventListener(UPDATE_CREDIT_EVENT, handleCreditUpdate);
    return () => {
      window.removeEventListener(UPDATE_CREDIT_EVENT, handleCreditUpdate);
    };
  }, [handleCreditUpdate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isOnline,
        isOfflineMode,
        isSandboxMode,
        enterOfflineMode,
        enterSandboxMode,
        exitOfflineMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
