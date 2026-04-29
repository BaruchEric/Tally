import type { LedgerEntry, LedgerMember } from "@/src/lib/ledgers/schema";
import { computeLedgerNetBalances, computeSimplifiedDebts } from "@/src/lib/ledgers/balances";

export type StatementModel = {
  title: string;
  generatedAt: string;
  entries: LedgerEntry[];
  members: LedgerMember[];
  totals: ReturnType<typeof computeLedgerNetBalances>;
  settlements: ReturnType<typeof computeSimplifiedDebts>;
};

export function buildStatementModel({
  title,
  entries,
  members,
  currency
}: {
  title: string;
  entries: LedgerEntry[];
  members: LedgerMember[];
  currency: string;
}): StatementModel {
  return {
    title,
    generatedAt: new Date().toISOString(),
    entries,
    members,
    totals: computeLedgerNetBalances(entries, currency),
    settlements: computeSimplifiedDebts(entries, currency)
  };
}
