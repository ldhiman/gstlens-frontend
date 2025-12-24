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
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { UPDATE_CREDIT_EVENT } from "@/lib/constants";

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      const ref = doc(db, "users", firebaseUser.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setUserProfile({ primary_gstin: null });
      } else {
        setUserProfile(snap.data());
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Handle custom credit update event
  const handleCreditUpdate = useCallback(async () => {
    if (!user) return;

    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const newProfile = snap.data();
        // Critical: Create a new object reference
        setUserProfile((prev: any) => {
          // Only update if data actually changed (optional optimization)
          if (JSON.stringify(prev) === JSON.stringify(newProfile)) return prev;
          return { ...newProfile };
        });
      }
    } catch (error) {
      console.error(
        "Failed to refresh user profile after credit update:",
        error
      );
    }
  }, [user]); // Re-create only when user changes

  useEffect(() => {
    // Now safe: handleCreditUpdate is stable thanks to useCallback
    window.addEventListener(UPDATE_CREDIT_EVENT, handleCreditUpdate);

    return () => {
      window.removeEventListener(UPDATE_CREDIT_EVENT, handleCreditUpdate);
    };
  }, [handleCreditUpdate]); // Depend on the stable callback

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
