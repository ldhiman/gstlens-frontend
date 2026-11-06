import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { secureCall } from "@/lib/api";

const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    try {
      await secureCall();
    } catch (apiErr) {
      // Backend sync error should not block user authentication
      console.warn("Backend secureCall skipped or failed:", apiErr);
    }
    return result.user;
  } catch (error: any) {
    console.error("Google sign-in error:", error);
    throw error;
  }
}

export async function logout() {
  await signOut(auth);
}

