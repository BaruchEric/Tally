import type { ReactNode } from "react";

import { AuthGate } from "@/src/components/auth/AuthGate";
import { AppShell } from "@/src/components/nav/AppShell";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <AuthGate>{children}</AuthGate>
    </AppShell>
  );
}
