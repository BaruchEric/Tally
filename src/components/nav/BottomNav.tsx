"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ReceiptText, Scale, Settings, Users } from "lucide-react";

import { cn } from "@/src/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/ledgers/demo-ledger", label: "Entries", icon: ReceiptText },
  { href: "/ledgers/demo-ledger/balances", label: "Balances", icon: Scale },
  { href: "/ledgers/demo-ledger/members", label: "Members", icon: Users },
  { href: "/profile", label: "Profile", icon: Settings }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/95 backdrop-blur md:hidden">
      <div className="grid h-16 grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium text-[var(--muted)]",
                active && "text-[var(--primary)]"
              )}
              href={item.href}
              key={item.href}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
