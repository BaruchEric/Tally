import { describe, expect, it } from "vitest";

import type { ExpenseEntry } from "@/src/lib/ledgers/schema";
import { allocateMinorUnits, computeExpenseDeltas, splitExpenseAmount } from "@/src/lib/ledgers/splits";

describe("split helpers", () => {
  it("allocates remainders deterministically", () => {
    expect(allocateMinorUnits(100, [1, 1, 1])).toEqual([34, 33, 33]);
  });

  it("computes equal-split expense deltas", () => {
    const entry: ExpenseEntry = {
      id: "e1",
      ledgerId: "l1",
      type: "expense",
      createdBy: "a",
      payerUid: "a",
      amount: { amountMinor: 3000, currency: "USD" },
      split: { mode: "equal", participants: ["a", "b", "c"] },
      date: "2026-04-28",
      description: "Dinner"
    };

    expect(computeExpenseDeltas(entry)).toEqual({ a: 2000, b: -1000, c: -1000 });
  });

  it("computes exact, share, and percent split amounts", () => {
    expect(
      splitExpenseAmount(1000, {
        mode: "exact",
        participants: [
          { uid: "a", amountMinor: 250 },
          { uid: "b", amountMinor: 750 }
        ]
      })
    ).toEqual([
      { uid: "a", amountMinor: 250 },
      { uid: "b", amountMinor: 750 }
    ]);

    expect(
      splitExpenseAmount(1000, {
        mode: "shares",
        participants: [
          { uid: "a", shares: 1 },
          { uid: "b", shares: 3 }
        ]
      })
    ).toEqual([
      { uid: "a", amountMinor: 250 },
      { uid: "b", amountMinor: 750 }
    ]);

    expect(
      splitExpenseAmount(1000, {
        mode: "percent",
        participants: [
          { uid: "a", basisPoints: 2500 },
          { uid: "b", basisPoints: 7500 }
        ]
      })
    ).toEqual([
      { uid: "a", amountMinor: 250 },
      { uid: "b", amountMinor: 750 }
    ]);
  });
});
