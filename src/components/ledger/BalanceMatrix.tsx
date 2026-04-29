"use client";

import type { NetBalance } from "@/src/lib/ledgers/balances";
import type { LedgerMember } from "@/src/lib/ledgers/schema";
import { formatMoney, makeMoney } from "@/src/lib/money";

function memberName(uid: string, members: LedgerMember[]) {
  return members.find((member) => member.uid === uid)?.displayName ?? uid;
}

export function BalanceMatrix({ balances, members }: { balances: NetBalance[]; members: LedgerMember[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
      {balances.map((balance) => (
        <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--border)] p-3 last:border-b-0" key={balance.uid}>
          <span className="font-medium">{memberName(balance.uid, members)}</span>
          <span className={balance.amountMinor >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}>
            {formatMoney(makeMoney(balance.amountMinor, balance.currency))}
          </span>
        </div>
      ))}
    </div>
  );
}
