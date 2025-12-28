"use client";

import { useEffect, useState } from "react";

/* ---------------- Types ---------------- */

type User = {
  uid?: string;
  displayName?: string;
  photoURL?: string | null;
};

type Props = {
  user: User;
};

/* ---------------- Deterministic Colors ---------------- */

const AVATAR_GRADIENTS = [
  "from-blue-600 to-indigo-600",
  "from-emerald-600 to-teal-600",
  "from-violet-600 to-purple-600",
  "from-rose-600 to-pink-600",
  "from-amber-600 to-orange-600",
  "from-cyan-600 to-sky-600",
];

function getDeterministicGradient(seed: string): string {
  let hash = 0;

  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

/* ---------------- Component ---------------- */

export default function UserAvatar({ user }: Props) {
  const [errored, setErrored] = useState(false);

  // Reset when photo changes
  useEffect(() => {
    setErrored(false);
  }, [user?.photoURL]);

  const photoURL = user?.photoURL ?? null;
  const fallbackLetter =
    user?.displayName?.trim()?.charAt(0)?.toUpperCase() || "U";

  const seed = user?.uid || user?.displayName || "user";
  const gradient = getDeterministicGradient(seed);

  /* ---------- No image OR failed → fallback ---------- */
  if (!photoURL || errored) {
    return (
      <div
        className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient}
                    text-white flex items-center justify-center
                    text-sm font-semibold shrink-0`}
        aria-label="User avatar fallback"
      >
        {fallbackLetter}
      </div>
    );
  }

  /* ---------- Image + Skeleton Overlay ---------- */
  return (
    <div className="relative w-8 h-8 shrink-0">
      {/* Skeleton */}

      {/* Image */}
      <img
        src={photoURL}
        alt={user?.displayName ?? "User avatar"}
        className={`w-8 h-8 rounded-full object-cover transition-opacity duration-200 
         opacity-100
        `}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setErrored(true)}
      />
    </div>
  );
}
