import type { LedgerEntry } from "@/src/lib/ledgers/schema";
import { computeExpenseDeltas, type DeltaMap } from "@/src/lib/ledgers/splits";
import { convertMoney, makeMoney } from "@/src/lib/money";

export type NetBalance = {
  uid: string;
  amountMinor: number;
  currency: string;
};

export type SimplifiedDebt = {
  fromUid: string;
  toUid: string;
  amountMinor: number;
  currency: string;
};

export type FxSnapshot = {
  date: string;
  base: string;
  rates: Record<string, number | string>;
};

function addNet(balance: Record<string, number>, uid: string, amountMinor: number) {
  balance[uid] = (balance[uid] ?? 0) + amountMinor;
}

function convertDelta(amountMinor: number, fromCurrency: string, targetCurrency: string, fx?: FxSnapshot) {
  if (fromCurrency === targetCurrency) {
    return amountMinor;
  }

  if (!fx) {
    throw new Error(`Missing FX snapshot for ${fromCurrency} to ${targetCurrency}.`);
  }

  return convertMoney(makeMoney(amountMinor, fromCurrency), targetCurrency, fx.rates).amountMinor;
}

export function computeEntryDeltas(entry: LedgerEntry): DeltaMap {
  switch (entry.type) {
    case "expense":
      return computeExpenseDeltas(entry);

    case "transfer":
      return {
        [entry.fromUid]: entry.amount.amountMinor,
        [entry.toUid]: -entry.amount.amountMinor
      };

    case "adjustment":
      return {
        [entry.targetUid]: entry.amount.amountMinor
      };
  }
}

export function computeLedgerNetBalances(
  entries: LedgerEntry[],
  ledgerCurrency = "USD",
  fxByDate: Record<string, FxSnapshot> = {}
): NetBalance[] {
  const net: Record<string, number> = {};
  const currency = ledgerCurrency.toUpperCase();

  for (const entry of entries) {
    if (entry.deletedAt) {
      continue;
    }

    const entryCurrency = entry.amount.currency;
    const fx = fxByDate[entry.date];
    const deltas = computeEntryDeltas(entry);

    for (const [uid, amountMinor] of Object.entries(deltas)) {
      addNet(net, uid, convertDelta(amountMinor, entryCurrency, currency, fx));
    }
  }

  return Object.entries(net)
    .map(([uid, amountMinor]) => ({ uid, amountMinor, currency }))
    .sort((left, right) => left.uid.localeCompare(right.uid));
}

export function simplifyDebts(netBalances: NetBalance[], toleranceMinor = 1): SimplifiedDebt[] {
  if (netBalances.length === 0) {
    return [];
  }

  const currency = netBalances[0].currency;
  const creditors = netBalances
    .filter((balance) => balance.amountMinor > toleranceMinor)
    .map((balance) => ({ ...balance }))
    .sort((left, right) => right.amountMinor - left.amountMinor);
  const debtors = netBalances
    .filter((balance) => balance.amountMinor < -toleranceMinor)
    .map((balance) => ({ ...balance, amountMinor: Math.abs(balance.amountMinor) }))
    .sort((left, right) => right.amountMinor - left.amountMinor);

  const settlements: SimplifiedDebt[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountMinor = Math.min(debtor.amountMinor, creditor.amountMinor);

    if (amountMinor > toleranceMinor) {
      settlements.push({
        fromUid: debtor.uid,
        toUid: creditor.uid,
        amountMinor,
        currency
      });
    }

    debtor.amountMinor -= amountMinor;
    creditor.amountMinor -= amountMinor;

    if (debtor.amountMinor <= toleranceMinor) {
      debtorIndex += 1;
    }

    if (creditor.amountMinor <= toleranceMinor) {
      creditorIndex += 1;
    }
  }

  return settlements;
}

export function computeSimplifiedDebts(
  entries: LedgerEntry[],
  ledgerCurrency = "USD",
  fxByDate: Record<string, FxSnapshot> = {}
) {
  return simplifyDebts(computeLedgerNetBalances(entries, ledgerCurrency, fxByDate));
}

