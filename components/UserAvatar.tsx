"use client";

import { useEffect, useState } from "react";

type Props = {
  user: {
    uid?: string;
    displayName?: string;
    photoURL?: string | null;
  };
};

export default function UserAvatar({ user }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!user?.photoURL) return;

    setSrc(user.photoURL);
    setErrored(false); // reset on user change
  }, [user?.uid]);

  const fallbackLetter =
    user?.displayName?.trim()?.charAt(0)?.toUpperCase() || "U";

  // 👉 Fallback Avatar
  if (!src || errored) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
        {fallbackLetter}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="User avatar"
      className="w-8 h-8 rounded-full object-cover"
      loading="lazy"
      onError={() => {
        console.warn("Avatar failed to load, falling back");
        setErrored(true);
      }}
    />
  );
}
