import { Home, ReceiptText, Scale, Settings, Users, type LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  icon: LucideIcon;
  ledgerPath?: string;
  href?: string;
};

export const navItems: NavItem[] = [
  { label: "Home", icon: Home, href: "/" },
  { label: "Entries", icon: ReceiptText, ledgerPath: "" },
  { label: "Balances", icon: Scale, ledgerPath: "/balances" },
  { label: "Members", icon: Users, ledgerPath: "/members" },
  { label: "Profile", icon: Settings, href: "/profile" }
];

export function activeLedgerIdFromPathname(pathname: string): string | null {
  const match = /^\/ledgers\/([^/]+)/.exec(pathname);
  if (!match) {
    return null;
  }

  const id = match[1];
  if (id === "new") {
    return null;
  }

  return id;
}

export function resolveNavHref(item: NavItem, activeLedgerId: string | null): string | null {
  if (item.href) {
    return item.href;
  }

  if (item.ledgerPath !== undefined && activeLedgerId) {
    return `/ledgers/${activeLedgerId}${item.ledgerPath}`;
  }

  return null;
}

export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
