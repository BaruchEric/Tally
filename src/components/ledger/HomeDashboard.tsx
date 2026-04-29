"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { LedgerCard } from "@/src/components/ledger/LedgerCard";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { useLedgers } from "@/src/hooks/useLedgers";
import { demoEntries, demoLedger } from "@/src/lib/ledgers/schema";

export function HomeDashboard() {
  const { ledgers, loading } = useLedgers();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Ledgers</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Shared tabs, receipts, and settlements.</p>
        </div>
        <Button asChild>
          <Link href="/ledgers/new">
            <Plus className="h-4 w-4" />
            Ledger
          </Link>
        </Button>
      </div>
      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-[var(--muted)]">Loading ledgers…</CardContent>
        </Card>
      ) : ledgers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No ledgers yet</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/ledgers/new">Create ledger</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ledgers.map((ledger) => (
            <LedgerCard entries={ledger.id === demoLedger.id ? demoEntries : []} key={ledger.id} ledger={ledger} />
          ))}
        </div>
      )}
    </div>
  );
}
