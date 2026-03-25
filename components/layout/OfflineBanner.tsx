"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const on = () => {
      setOnline(true);
      setDismissed(false);
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (online || dismissed) return null;

  return (
    <div
      className="sticky top-0 z-[2000] flex items-center gap-2 w-full bg-yellow-500 text-black px-3 py-2.5 text-sm font-medium shadow-md"
      role="alert"
    >
      <span className="flex-1 leading-snug">
        ⚠️ You are offline — map and reports require connection. Cached data may be stale.
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 p-2 rounded-md hover:bg-black/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Dismiss offline notice"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
