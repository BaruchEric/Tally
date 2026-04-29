"use client";

import Link from "next/link";
import { ArrowRight, ReceiptText, Users } from "lucide-react";
import { useMemo } from "react";

import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { computeLedgerNetBalances } from "@/src/lib/ledgers/balances";
import type { Ledger, LedgerEntry } from "@/src/lib/ledgers/schema";
import { formatMinor } from "@/src/lib/money";

export function LedgerCard({ ledger, entries }: { ledger: Ledger; entries?: LedgerEntry[] }) {
  const totalOpen = useMemo(() => {
    if (!entries || entries.length === 0) {
      return null;
    }

    return computeLedgerNetBalances(entries, ledger.currency).reduce(
      (sum, balance) => sum + Math.max(0, balance.amountMinor),
      0
    );
  }, [entries, ledger.currency]);

  return (
    <Link href={`/ledgers/${ledger.id}`}>
      <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="line-clamp-2">{ledger.name}</CardTitle>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)]" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {totalOpen !== null ? (
            <div className="text-2xl font-semibold">{formatMinor(totalOpen, ledger.currency)}</div>
          ) : null}
          <div className="flex flex-wrap gap-2 text-sm text-[var(--muted)]">
            <Badge>
              <Users className="mr-1 h-3.5 w-3.5" />
              {ledger.memberUids.length}
            </Badge>
            {entries ? (
              <Badge>
                <ReceiptText className="mr-1 h-3.5 w-3.5" />
                {entries.length}
              </Badge>
            ) : null}
            <Badge>{ledger.currency}</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
