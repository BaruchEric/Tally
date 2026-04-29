import type { Metadata } from "next";

import { BalancesPageClient } from "@/src/components/ledger/BalancesPageClient";

export const metadata: Metadata = {
  title: "Balances"
};

export default async function BalancesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BalancesPageClient ledgerId={id} />;
}
