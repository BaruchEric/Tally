import type { Metadata } from "next";

import { LedgerOverview } from "@/src/components/ledger/LedgerOverview";

export const metadata: Metadata = {
  title: "Ledger"
};

export default async function LedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LedgerOverview ledgerId={id} />;
}
