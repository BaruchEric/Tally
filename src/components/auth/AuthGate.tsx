"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/src/lib/auth/AuthProvider";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading, configured } = useAuth();

  useEffect(() => {
    if (!configured) {
      return;
    }

    if (!loading && !user) {
      router.replace("/sign-in");
    }
  }, [configured, loading, router, user]);

  if (configured && (loading || !user)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--muted)]">
        {loading ? "Loading…" : "Redirecting to sign in…"}
      </div>
    );
  }

  return <>{children}</>;
}
