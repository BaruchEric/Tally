import { describe, expect, it } from "vitest";

import { entriesToCsv } from "@/src/lib/exports/csv";
import { buildStatementModel } from "@/src/lib/exports/statement";
import { demoEntries, demoLedger, demoMembers } from "@/src/lib/ledgers/schema";

describe("exports", () => {
  it("exports entries as valid CSV rows", () => {
    const csv = entriesToCsv(demoEntries.slice(0, 1), demoMembers);

    expect(csv.split("\n")[0]).toBe("date,type,description,payer/from,to,amountMinor,currency,participants,note");
    expect(csv).toContain("2026-04-28,expense,Groceries,Alex,,9300,USD,Alex; Sam; Riley,");
  });

  it("builds statement totals and settlements from entries", () => {
    const statement = buildStatementModel({
      title: demoLedger.name,
      entries: demoEntries,
      members: demoMembers,
      currency: demoLedger.currency
    });

    expect(statement.entries).toHaveLength(3);
    expect(statement.totals.map((balance) => balance.uid)).toEqual(["alex", "riley", "sam"]);
    expect(statement.settlements.length).toBeGreaterThan(0);
  });
});
