"use client";

import Link from "next/link";
import { Download, Plus, Settings } from "lucide-react";
import { useMemo, useState } from "react";

import { ActivityFeed } from "@/src/components/ledger/ActivityFeed";
import { BalanceMatrix } from "@/src/components/ledger/BalanceMatrix";
import { EntryList } from "@/src/components/ledger/EntryList";
import { SimplifiedDebts } from "@/src/components/ledger/SimplifiedDebts";
import { StatementDownload } from "@/src/components/ledger/StatementDownload";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select } from "@/src/components/ui/select";
import { useAuditLogs } from "@/src/hooks/useAuditLogs";
import { useBalances } from "@/src/hooks/useBalances";
import { useEntries } from "@/src/hooks/useEntries";
import { useLedger } from "@/src/hooks/useLedger";
import { useMembers } from "@/src/hooks/useMembers";
import { entriesToCsv } from "@/src/lib/exports/csv";
import { downloadBlob } from "@/src/lib/exports/download";
import { buildStatementModel } from "@/src/lib/exports/statement";
import { getEntryParticipants } from "@/src/lib/ledgers/members";
import type { LedgerEntry } from "@/src/lib/ledgers/schema";

type EntryTypeFilter = "all" | LedgerEntry["type"];

export function LedgerOverview({ ledgerId }: { ledgerId: string }) {
  const { ledger, loading: ledgerLoading } = useLedger(ledgerId);
  const { entries, loading: entriesLoading, hasPendingWrites, fromCache } = useEntries(ledgerId);
  const { members } = useMembers(ledgerId);
  const { auditLogs } = useAuditLogs(ledgerId);
  const [typeFilter, setTypeFilter] = useState<EntryTypeFilter>("all");
  const [memberFilter, setMemberFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const currency = ledger?.currency ?? "USD";
  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (typeFilter !== "all" && entry.type !== typeFilter) {
          return false;
        }

        if (memberFilter !== "all" && !getEntryParticipants(entry).includes(memberFilter)) {
          return false;
        }

        if (dateFrom && entry.date < dateFrom) {
          return false;
        }

        if (dateTo && entry.date > dateTo) {
          return false;
        }

        return true;
      }),
    [dateFrom, dateTo, entries, memberFilter, typeFilter]
  );
  const { netBalances, settlements } = useBalances(entries, currency);
  const statement = useMemo(
    () =>
      ledger
        ? buildStatementModel({
            title: ledger.name,
            entries: filteredEntries,
            members,
            currency
          })
        : null,
    [currency, filteredEntries, ledger, members]
  );

  function downloadCsv() {
    const csv = entriesToCsv(filteredEntries, members);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, `${ledger?.name ?? "tally"}-entries.csv`);
  }

  if (ledgerLoading || entriesLoading) {
    return <Card><CardContent className="p-6">Loading ledger…</CardContent></Card>;
  }

  if (!ledger) {
    return <Card><CardContent className="p-6">Ledger not found.</CardContent></Card>;
  }

  return (
    <div className="grid gap-6">
      {(hasPendingWrites || fromCache) && (
        <div className="rounded-md border border-[var(--border)] bg-white p-3 text-sm text-[var(--muted)]">
          {hasPendingWrites ? "Saving changes…" : "Showing cached data."}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">{ledger.name}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{ledger.currency} ledger</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/ledgers/${ledger.id}/entries/new`}>
              <Plus className="h-4 w-4" />
              Entry
            </Link>
          </Button>
          <Button onClick={downloadCsv} variant="secondary">
            <Download className="h-4 w-4" />
            CSV
          </Button>
          {statement ? <StatementDownload model={statement} /> : null}
          <Button asChild size="icon" title="Settings" variant="ghost">
            <Link href={`/ledgers/${ledger.id}/settings`}>
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Entries</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3 sm:grid-cols-4">
              <div className="grid gap-1">
                <Label htmlFor="dateFrom">From</Label>
                <Input id="dateFrom" onChange={(event) => setDateFrom(event.target.value)} type="date" value={dateFrom} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="dateTo">To</Label>
                <Input id="dateTo" onChange={(event) => setDateTo(event.target.value)} type="date" value={dateTo} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="typeFilter">Type</Label>
                <Select
                  id="typeFilter"
                  onChange={(event) => setTypeFilter(event.target.value as EntryTypeFilter)}
                  value={typeFilter}
                >
                  <option value="all">All</option>
                  <option value="expense">Expense</option>
                  <option value="transfer">Transfer</option>
                  <option value="adjustment">Adjustment</option>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="memberFilter">Member</Label>
                <Select id="memberFilter" onChange={(event) => setMemberFilter(event.target.value)} value={memberFilter}>
                  <option value="all">All</option>
                  {members.map((member) => (
                    <option key={member.uid} value={member.uid}>
                      {member.displayName ?? member.email ?? member.uid}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <EntryList entries={filteredEntries} members={members} />
          </CardContent>
        </Card>
        <div className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceMatrix balances={netBalances} members={members} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Settle up</CardTitle>
            </CardHeader>
            <CardContent>
              <SimplifiedDebts debts={settlements} ledgerId={ledger.id} members={members} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed auditLogs={auditLogs} members={members} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
