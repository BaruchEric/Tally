import { add, dinero, subtract, toSnapshot } from "dinero.js";

import type { MoneyValue } from "@/src/lib/ledgers/schema";

type DineroCurrency = {
  code: string;
  base: number;
  exponent: number;
};

const currencyExponents: Record<string, number> = {
  AUD: 2,
  CAD: 2,
  CHF: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  USD: 2
};

export function getCurrencyExponent(currency: string) {
  return currencyExponents[currency.toUpperCase()] ?? 2;
}

export function getCurrencyMeta(currency: string): DineroCurrency {
  return {
    code: currency.toUpperCase(),
    base: 10,
    exponent: getCurrencyExponent(currency)
  };
}

export function makeMoney(amountMinor: number, currency = "USD"): MoneyValue {
  if (!Number.isInteger(amountMinor)) {
    throw new Error("Money must be stored as integer minor units.");
  }

  return {
    amountMinor,
    currency: currency.toUpperCase()
  };
}

export function toDinero(value: MoneyValue) {
  return dinero({
    amount: value.amountMinor,
    currency: getCurrencyMeta(value.currency)
  });
}

export function assertSameCurrency(left: MoneyValue, right: MoneyValue) {
  if (left.currency !== right.currency) {
    throw new Error(`Currency mismatch: ${left.currency} !== ${right.currency}`);
  }
}

export function addMoney(left: MoneyValue, right: MoneyValue): MoneyValue {
  assertSameCurrency(left, right);
  const result = add(toDinero(left), toDinero(right));
  return makeMoney(Number(toSnapshot(result).amount), left.currency);
}

export function subtractMoney(left: MoneyValue, right: MoneyValue): MoneyValue {
  assertSameCurrency(left, right);
  const result = subtract(toDinero(left), toDinero(right));
  return makeMoney(Number(toSnapshot(result).amount), left.currency);
}

export function parseMoneyInput(input: string, currency = "USD"): MoneyValue {
  const exponent = getCurrencyExponent(currency);
  const normalized = input.trim().replace(/,/g, "");

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Enter a valid amount.");
  }

  const isNegative = normalized.startsWith("-");
  const unsigned = isNegative ? normalized.slice(1) : normalized;
  const [majorPart, decimalPart = ""] = unsigned.split(".");
  const paddedDecimals = decimalPart.padEnd(exponent, "0").slice(0, exponent);
  const extraDecimals = decimalPart.slice(exponent);

  if (extraDecimals.length > 0 && /[1-9]/.test(extraDecimals)) {
    throw new Error(`${currency.toUpperCase()} supports ${exponent} decimal places.`);
  }

  const majorMinor = Number.parseInt(majorPart, 10) * 10 ** exponent;
  const minor = majorMinor + (paddedDecimals ? Number.parseInt(paddedDecimals, 10) : 0);

  return makeMoney(isNegative ? -minor : minor, currency);
}

export function formatMoney(value: MoneyValue, locale = "en-US") {
  const exponent = getCurrencyExponent(value.currency);
  const renderedAmount = value.amountMinor / 10 ** exponent;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: value.currency,
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent
  }).format(renderedAmount);
}

function parseRateToMicros(rate: number | string) {
  const text = String(rate);
  const [major, decimals = ""] = text.split(".");
  const micros = `${decimals}000000`.slice(0, 6);
  return Number.parseInt(major, 10) * 1_000_000 + Number.parseInt(micros, 10);
}

export function convertMoney(
  value: MoneyValue,
  targetCurrency: string,
  rates: Record<string, number | string>
): MoneyValue {
  const normalizedTarget = targetCurrency.toUpperCase();

  if (value.currency === normalizedTarget) {
    return value;
  }

  const rate = rates[normalizedTarget];
  if (rate === undefined) {
    throw new Error(`Missing FX rate for ${normalizedTarget}.`);
  }

  const micros = parseRateToMicros(rate);
  const converted = Math.round((value.amountMinor * micros) / 1_000_000);
  return makeMoney(converted, normalizedTarget);
}
