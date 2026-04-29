"use client";

import type { NetBalance } from "@/src/lib/ledgers/balances";
import { getMemberName } from "@/src/lib/ledgers/members";
import type { LedgerMember } from "@/src/lib/ledgers/schema";
import { formatMinor } from "@/src/lib/money";

export function BalanceMatrix({ balances, members }: { balances: NetBalance[]; members: LedgerMember[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
      {balances.map((balance) => (
        <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--border)] p-3 last:border-b-0" key={balance.uid}>
          <span className="font-medium">{getMemberName(balance.uid, members)}</span>
          <span
            className={
              balance.amountMinor > 0
                ? "text-[var(--positive)]"
                : balance.amountMinor < 0
                  ? "text-[var(--negative)]"
                  : "text-[var(--muted)]"
            }
          >
            {formatMinor(balance.amountMinor, balance.currency)}
          </span>
        </div>
      ))}
    </div>
  );
}
