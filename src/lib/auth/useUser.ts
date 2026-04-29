"use client";

import { useAuth } from "@/src/lib/auth/AuthProvider";

export function useUser() {
  const { user, loading, configured } = useAuth();
  return { user, loading, configured };
}
