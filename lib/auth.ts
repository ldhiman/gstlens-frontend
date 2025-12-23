import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { secureCall } from "@/lib/api";
import { redirect } from "next/navigation";

const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider);

  const user = result.user;

  await secureCall();

  return redirect("/dashboard");
}

export async function logout() {
  await signOut(auth);
}
