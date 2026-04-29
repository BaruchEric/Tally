"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleDollarSign, LogOut, Plus, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { BottomNav } from "@/src/components/nav/BottomNav";
import { activeLedgerIdFromPathname, isNavItemActive, navItems, resolveNavHref } from "@/src/components/nav/navItems";
import { OfflineBanner } from "@/src/components/system/OfflineBanner";
import { Button } from "@/src/components/ui/button";
import { useAuth } from "@/src/lib/auth/AuthProvider";
import { cn } from "@/src/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading, configured, signOut } = useAuth();
  const activeLedgerId = activeLedgerIdFromPathname(pathname ?? "");
  const topItems = navItems
    .filter((item) => item.label !== "Entries")
    .map((item) => ({ item, href: resolveNavHref(item, activeLedgerId) }))
    .filter(({ href }) => href !== null) as Array<{ item: (typeof navItems)[number]; href: string }>;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <OfflineBanner />
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link className="flex items-center gap-2 font-semibold" href="/">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--primary)] text-white">
              <CircleDollarSign className="h-5 w-5" />
            </span>
            <span className="text-lg">Tally</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {topItems.map(({ item, href }) => (
              <Link
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] transition hover:bg-white hover:text-[var(--foreground)]",
                  isNavItemActive(href, pathname ?? "") && "bg-white text-[var(--foreground)] shadow-sm"
                )}
                href={href}
                key={item.label}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild className="hidden sm:inline-flex" size="sm">
              <Link href="/ledgers/new">
                <Plus className="h-4 w-4" />
                Ledger
              </Link>
            </Button>
            {loading ? null : user ? (
              <Button aria-label="Sign out" onClick={() => void signOut()} size="icon" title="Sign out" variant="ghost">
                <LogOut className="h-5 w-5" />
              </Button>
            ) : (
              <Button asChild size="sm" variant={configured ? "secondary" : "ghost"}>
                <Link href="/sign-in">
                  <UserRound className="h-4 w-4" />
                  {configured ? "Sign in" : "Demo"}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8">{children}</main>
      <BottomNav />
    </div>
  );
}
