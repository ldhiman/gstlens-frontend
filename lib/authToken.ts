import { auth } from "@/lib/firebase";

export async function getIdToken() {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(); // JWT
  } catch (err) {
    console.warn("getIdToken failed or offline:", err);
    return null;
  }
}

