import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { secureCall } from "@/lib/api";

const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  await signInWithPopup(auth, provider);
  await secureCall();
  window.location.href = "/dashboard";
}

export async function logout() {
  await signOut(auth);
}
