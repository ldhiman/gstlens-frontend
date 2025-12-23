import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";

export async function createUserProfile(user: User) {
  await setDoc(
    doc(db, "users", user.uid),
    {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      primary_gstin: null,
      gst_verified: false,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}
