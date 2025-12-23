import { auth } from "@/lib/firebase";

export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;

  return await user.getIdToken(); // JWT
}
