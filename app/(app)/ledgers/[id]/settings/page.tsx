import type { Metadata } from "next";

import { LedgerSettings } from "@/src/components/ledger/LedgerSettings";

export const metadata: Metadata = {
  title: "Ledger settings"
};

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LedgerSettings ledgerId={id} />;
}
