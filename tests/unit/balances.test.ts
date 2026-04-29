import { describe, expect, it } from "vitest";

import { computeLedgerNetBalances, computeSimplifiedDebts, simplifyDebts } from "@/src/lib/ledgers/balances";
import type { LedgerEntry } from "@/src/lib/ledgers/schema";

const entries: LedgerEntry[] = [
  {
    id: "e1",
    ledgerId: "l1",
    type: "expense",
    createdBy: "a",
    payerUid: "a",
    amount: { amountMinor: 9000, currency: "USD" },
    split: { mode: "equal", participants: ["a", "b", "c"] },
    date: "2026-04-28",
    description: "Groceries"
  },
  {
    id: "e2",
    ledgerId: "l1",
    type: "transfer",
    createdBy: "b",
    fromUid: "b",
    toUid: "a",
    amount: { amountMinor: 1000, currency: "USD" },
    date: "2026-04-28",
    description: "Settle"
  }
];

describe("balances", () => {
  it("computes net balances from expenses and transfers", () => {
    expect(computeLedgerNetBalances(entries, "USD")).toEqual([
      { uid: "a", amountMinor: 5000, currency: "USD" },
      { uid: "b", amountMinor: -2000, currency: "USD" },
      { uid: "c", amountMinor: -3000, currency: "USD" }
    ]);
  });

  it("simplifies debts greedily", () => {
    expect(computeSimplifiedDebts(entries, "USD")).toEqual([
      { fromUid: "c", toUid: "a", amountMinor: 3000, currency: "USD" },
      { fromUid: "b", toUid: "a", amountMinor: 2000, currency: "USD" }
    ]);
  });

  it("ignores one-minor-unit rounding noise", () => {
    expect(
      simplifyDebts([
        { uid: "a", amountMinor: 1, currency: "USD" },
        { uid: "b", amountMinor: -1, currency: "USD" }
      ])
    ).toEqual([]);
  });

  it("uses FX snapshots for display-currency balances", () => {
    const multi: LedgerEntry[] = [
      {
        id: "e1",
        ledgerId: "l1",
        type: "expense",
        createdBy: "a",
        payerUid: "a",
        amount: { amountMinor: 1000, currency: "USD" },
        split: { mode: "equal", participants: ["a", "b"] },
        date: "2026-04-28",
        description: "Coffee"
      }
    ];

    expect(
      computeLedgerNetBalances(multi, "EUR", {
        "2026-04-28": { date: "2026-04-28", base: "USD", rates: { EUR: "0.900000" } }
      })
    ).toEqual([
      { uid: "a", amountMinor: 450, currency: "EUR" },
      { uid: "b", amountMinor: -450, currency: "EUR" }
    ]);
  });
});
