import type { ReactNode } from "react";

import { AppShell } from "@/src/components/nav/AppShell";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
