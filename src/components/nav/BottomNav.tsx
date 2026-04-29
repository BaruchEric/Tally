"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { activeLedgerIdFromPathname, isNavItemActive, navItems, resolveNavHref } from "@/src/components/nav/navItems";
import { cn } from "@/src/lib/utils";

export function BottomNav() {
  const pathname = usePathname() ?? "";
  const activeLedgerId = activeLedgerIdFromPathname(pathname);
  const items = navItems
    .map((item) => ({ item, href: resolveNavHref(item, activeLedgerId) }))
    .filter(({ href }) => href !== null) as Array<{ item: (typeof navItems)[number]; href: string }>;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-white/95 backdrop-blur md:hidden">
      <div
        className="grid h-16"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ item, href }) => {
          const Icon = item.icon;
          const active = isNavItemActive(href, pathname);
          return (
            <Link
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium text-[var(--muted)]",
                active && "text-[var(--primary)]"
              )}
              href={href}
              key={item.label}
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
