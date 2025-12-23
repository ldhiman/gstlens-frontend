"use client";

import { createContext, useContext, useEffect, useState } from "react";
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

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      setUserProfile(snap.data());
    }

    window.addEventListener(UPDATE_CREDIT_EVENT, fetchData);

    return () => {
      window.removeEventListener(UPDATE_CREDIT_EVENT, fetchData);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
