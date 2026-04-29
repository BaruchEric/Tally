import { describe, expect, it } from "vitest";

import { addMoney, convertMoney, formatMoney, parseMoneyInput, subtractMoney } from "@/src/lib/money";

describe("money helpers", () => {
  it("parses decimal input into integer minor units", () => {
    expect(parseMoneyInput("12.34", "USD")).toEqual({ amountMinor: 1234, currency: "USD" });
    expect(parseMoneyInput("500", "JPY")).toEqual({ amountMinor: 500, currency: "JPY" });
  });

  it("adds and subtracts only same-currency values", () => {
    expect(addMoney({ amountMinor: 500, currency: "USD" }, { amountMinor: 250, currency: "USD" })).toEqual({
      amountMinor: 750,
      currency: "USD"
    });
    expect(subtractMoney({ amountMinor: 500, currency: "USD" }, { amountMinor: 250, currency: "USD" })).toEqual({
      amountMinor: 250,
      currency: "USD"
    });
    expect(() => addMoney({ amountMinor: 500, currency: "USD" }, { amountMinor: 250, currency: "EUR" })).toThrow(
      "Currency mismatch"
    );
  });

  it("formats money at render time", () => {
    expect(formatMoney({ amountMinor: 1234, currency: "USD" }, "en-US")).toBe("$12.34");
  });

  it("converts with a stored FX snapshot", () => {
    expect(convertMoney({ amountMinor: 1000, currency: "USD" }, "EUR", { EUR: "0.920000" })).toEqual({
      amountMinor: 920,
      currency: "EUR"
    });
  });
});
