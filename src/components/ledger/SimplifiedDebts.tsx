"use client";

import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import type { SimplifiedDebt } from "@/src/lib/ledgers/balances";
import type { LedgerMember } from "@/src/lib/ledgers/schema";
import { formatMoney, makeMoney } from "@/src/lib/money";

function memberName(uid: string, members: LedgerMember[]) {
  return members.find((member) => member.uid === uid)?.displayName ?? uid;
}

export function SimplifiedDebts({
  debts,
  members,
  ledgerId
}: {
  debts: SimplifiedDebt[];
  members: LedgerMember[];
  ledgerId?: string;
}) {
  if (debts.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-white p-4 text-sm font-medium text-[var(--positive)]">
        Everyone is settled.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {debts.map((debt) => (
        <div
          className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-[var(--border)] bg-white p-3"
          key={`${debt.fromUid}-${debt.toUid}`}
        >
          <span>
            <span className="font-semibold">{memberName(debt.fromUid, members)}</span> pays{" "}
            <span className="font-semibold">{memberName(debt.toUid, members)}</span>
          </span>
          <span className="font-semibold">{formatMoney(makeMoney(debt.amountMinor, debt.currency))}</span>
          {ledgerId ? (
            <Button asChild size="sm" variant="secondary">
              <Link
                href={`/ledgers/${ledgerId}/entries/new?type=transfer&from=${encodeURIComponent(debt.fromUid)}&to=${encodeURIComponent(debt.toUid)}&amountMinor=${debt.amountMinor}&currency=${encodeURIComponent(debt.currency)}`}
              >
                Settle
              </Link>
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
