"use client";

import { CloudOff, UploadCloud } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribeToOnlineStatus(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);

  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function getServerOnlineSnapshot() {
  return true;
}

export function OfflineBanner({
  hasPendingWrites = false,
  fromCache = false
}: {
  hasPendingWrites?: boolean;
  fromCache?: boolean;
}) {
  const online = useSyncExternalStore(subscribeToOnlineStatus, getOnlineSnapshot, getServerOnlineSnapshot);

  if (online && !hasPendingWrites && !fromCache) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-3 top-3 z-50 mx-auto flex max-w-xl items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm shadow-lg">
      {online ? <UploadCloud className="h-4 w-4 text-[var(--warning)]" /> : <CloudOff className="h-4 w-4 text-[var(--negative)]" />}
      <span className="font-medium">
        {online ? "Syncing queued changes" : "Offline. New changes will sync when connection returns."}
      </span>
    </div>
  );
}
