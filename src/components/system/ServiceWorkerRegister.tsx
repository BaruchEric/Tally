"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/src/components/ui/button";
import { registerServiceWorker } from "@/src/lib/pwa/registerSW";

export function ServiceWorkerRegister() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    return registerServiceWorker(setRegistration);
  }, []);

  if (!registration) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-white p-3 text-sm shadow-lg md:bottom-4">
      <span className="font-medium">New version available.</span>
      <Button
        onClick={() => {
          registration.waiting?.postMessage({ type: "SKIP_WAITING" });
          window.location.reload();
        }}
        size="sm"
      >
        <RefreshCw className="h-4 w-4" />
        Reload
      </Button>
    </div>
  );
}
