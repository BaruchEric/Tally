"use client";

import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { ActivityFeed } from "@/src/components/ledger/ActivityFeed";
import { useAuditLogs } from "@/src/hooks/useAuditLogs";
import { useEntries } from "@/src/hooks/useEntries";
import { useMembers } from "@/src/hooks/useMembers";
import { formatEntryDate } from "@/src/lib/dates";
import { formatMoney } from "@/src/lib/money";

export function EntryDetail({ ledgerId, entryId }: { ledgerId: string; entryId: string }) {
  const { entries } = useEntries(ledgerId);
  const { members } = useMembers(ledgerId);
  const { auditLogs } = useAuditLogs(ledgerId);
  const entry = entries.find((candidate) => candidate.id === entryId);
  const entryHistory = auditLogs.filter((log) => log.targetPath.endsWith(`/entries/${entryId}`));

  if (!entry) {
    return <Card><CardContent className="p-6">Entry not found.</CardContent></Card>;
  }

  const memberName = (uid: string) => members.find((member) => member.uid === uid)?.displayName ?? uid;

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <Button asChild className="justify-self-start" variant="ghost">
        <Link href={`/ledgers/${ledgerId}`}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{entry.description}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--muted)]">Amount</dt>
              <dd className="font-semibold">{formatMoney(entry.amount)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Date</dt>
              <dd className="font-semibold">{formatEntryDate(entry.date)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Type</dt>
              <dd className="font-semibold">{entry.type}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Actor</dt>
              <dd className="font-semibold">
                {entry.type === "expense"
                  ? memberName(entry.payerUid)
                  : entry.type === "transfer"
                    ? `${memberName(entry.fromUid)} to ${memberName(entry.toUid)}`
                    : memberName(entry.targetUid)}
              </dd>
            </div>
          </dl>
          <div className="rounded-md border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm text-[var(--muted)]">
            <History className="mr-2 inline h-4 w-4" />
            Edit history is written to the ledger audit collection.
          </div>
          <ActivityFeed auditLogs={entryHistory} emptyLabel="No history rows for this entry yet." members={members} />
        </CardContent>
      </Card>
    </div>
  );
}
