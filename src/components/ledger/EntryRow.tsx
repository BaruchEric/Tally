"use client";

import Link from "next/link";
import { ArrowRightLeft, PencilLine, Receipt } from "lucide-react";

import { Badge } from "@/src/components/ui/badge";
import type { LedgerEntry, LedgerMember } from "@/src/lib/ledgers/schema";
import { formatEntryDate } from "@/src/lib/dates";
import { formatMoney } from "@/src/lib/money";

function memberName(uid: string, members: LedgerMember[]) {
  return members.find((member) => member.uid === uid)?.displayName ?? uid;
}

export function EntryRow({ entry, members }: { entry: LedgerEntry; members: LedgerMember[] }) {
  const Icon = entry.type === "transfer" ? ArrowRightLeft : entry.type === "adjustment" ? PencilLine : Receipt;
  const actor =
    entry.type === "expense"
      ? memberName(entry.payerUid, members)
      : entry.type === "transfer"
        ? `${memberName(entry.fromUid, members)} to ${memberName(entry.toUid, members)}`
        : memberName(entry.targetUid, members);

  return (
    <Link
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border border-[var(--border)] bg-white p-3 transition hover:bg-[var(--surface-soft)]"
      href={`/ledgers/${entry.ledgerId}/entries/${entry.id}`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--surface-soft)]">
        <Icon className="h-5 w-5 text-[var(--primary)]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium">{entry.description}</span>
        <span className="block truncate text-sm text-[var(--muted)]">
          {actor} · {formatEntryDate(entry.date)}
        </span>
      </span>
      <span className="grid justify-items-end gap-1">
        <span className="font-semibold">{formatMoney(entry.amount)}</span>
        <Badge>{entry.type}</Badge>
      </span>
    </Link>
  );
}
