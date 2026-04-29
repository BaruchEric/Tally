"use client";

import { useMemo } from "react";

import { computeLedgerNetBalances, simplifyDebts } from "@/src/lib/ledgers/balances";
import type { LedgerEntry } from "@/src/lib/ledgers/schema";

export function useBalances(entries: LedgerEntry[], currency: string) {
  return useMemo(() => {
    const netBalances = computeLedgerNetBalances(entries, currency);
    const settlements = simplifyDebts(netBalances);
    return { netBalances, settlements };
  }, [currency, entries]);
}
