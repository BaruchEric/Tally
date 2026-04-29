"use client";

import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";

import { BalanceMatrix } from "@/src/components/ledger/BalanceMatrix";
import { SimplifiedDebts } from "@/src/components/ledger/SimplifiedDebts";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { useBalances } from "@/src/hooks/useBalances";
import { useEntries } from "@/src/hooks/useEntries";
import { useLedger } from "@/src/hooks/useLedger";
import { useMembers } from "@/src/hooks/useMembers";

export function BalancesPageClient({ ledgerId }: { ledgerId: string }) {
  const { ledger } = useLedger(ledgerId);
  const { entries } = useEntries(ledgerId);
  const { members } = useMembers(ledgerId);
  const { netBalances, settlements } = useBalances(entries, ledger?.currency ?? "USD");

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Balances</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{ledger?.name ?? "Ledger"}</p>
        </div>
        <Button asChild>
          <Link href={`/ledgers/${ledgerId}/entries/new`}>
            <ArrowRightLeft className="h-4 w-4" />
            Settle up
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Net</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceMatrix balances={netBalances} members={members} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Simplified</CardTitle>
          </CardHeader>
          <CardContent>
            <SimplifiedDebts debts={settlements} ledgerId={ledgerId} members={members} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
