"use client";

import { EntryRow } from "@/src/components/ledger/EntryRow";
import type { LedgerEntry, LedgerMember } from "@/src/lib/ledgers/schema";

export function EntryList({ entries, members }: { entries: LedgerEntry[]; members: LedgerMember[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] bg-white p-8 text-center text-sm text-[var(--muted)]">
        No entries yet.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {entries.map((entry) => (
        <EntryRow entry={entry} key={entry.id} members={members} />
      ))}
    </div>
  );
}
