import { dinero } from "dinero.js";

import type { MoneyValue } from "@/src/lib/ledgers/schema";

type DineroCurrency = {
  code: string;
  base: number;
  exponent: number;
};

const zeroExponentCurrencies = new Set([
  "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW",
  "PYG", "RWF", "UGX", "UYI", "VND", "VUV", "XAF", "XOF", "XPF"
]);

const threeExponentCurrencies = new Set([
  "BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"
]);

const fourExponentCurrencies = new Set(["CLF", "UYW"]);

export const SUPPORTED_CURRENCIES = [
  "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "NZD", "SEK", "NOK", "DKK"
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function getCurrencyExponent(currency: string) {
  const code = currency.toUpperCase();
  if (zeroExponentCurrencies.has(code)) return 0;
  if (threeExponentCurrencies.has(code)) return 3;
  if (fourExponentCurrencies.has(code)) return 4;
  return 2;
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
  return makeMoney(left.amountMinor + right.amountMinor, left.currency);
}

export function subtractMoney(left: MoneyValue, right: MoneyValue): MoneyValue {
  assertSameCurrency(left, right);
  return makeMoney(left.amountMinor - right.amountMinor, left.currency);
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

export function formatMinor(amountMinor: number, currency: string, locale = "en-US") {
  return formatMoney(makeMoney(amountMinor, currency), locale);
}

function parseRateToMicros(rate: number | string) {
  const numeric = typeof rate === "number" ? rate : Number(rate);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error(`Invalid FX rate: ${rate}`);
  }

  return Math.round(numeric * 1_000_000);
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
