import type { ExpenseEntry, ExpenseSplit } from "@/src/lib/ledgers/schema";

export type DeltaMap = Record<string, number>;

function addDelta(deltas: DeltaMap, uid: string, amountMinor: number) {
  deltas[uid] = (deltas[uid] ?? 0) + amountMinor;
}

export function allocateMinorUnits(amountMinor: number, weights: number[]) {
  if (weights.length === 0) {
    throw new Error("At least one participant is required.");
  }

  const totalWeight = weights.reduce((sum, weight) => {
    if (!Number.isInteger(weight) || weight < 0) {
      throw new Error("Split weights must be non-negative integers.");
    }

    return sum + weight;
  }, 0);

  if (totalWeight <= 0) {
    throw new Error("Split weights must sum to more than zero.");
  }

  const allocations = weights.map((weight, index) => {
    const weightedAmount = amountMinor * weight;
    return {
      index,
      amountMinor: Math.trunc(weightedAmount / totalWeight),
      remainder: weightedAmount % totalWeight
    };
  });

  let remainder = amountMinor - allocations.reduce((sum, allocation) => sum + allocation.amountMinor, 0);
  const sorted = [...allocations].sort((left, right) => {
    if (right.remainder !== left.remainder) {
      return right.remainder - left.remainder;
    }

    return left.index - right.index;
  });

  for (const allocation of sorted) {
    if (remainder <= 0) {
      break;
    }

    allocation.amountMinor += 1;
    remainder -= 1;
  }

  return allocations.sort((left, right) => left.index - right.index).map((allocation) => allocation.amountMinor);
}

export function splitExpenseAmount(amountMinor: number, split: ExpenseSplit) {
  switch (split.mode) {
    case "equal": {
      const allocated = allocateMinorUnits(amountMinor, split.participants.map(() => 1));
      return split.participants.map((uid, index) => ({ uid, amountMinor: allocated[index] }));
    }

    case "exact": {
      const total = split.participants.reduce((sum, participant) => sum + participant.amountMinor, 0);
      if (total !== amountMinor) {
        throw new Error("Exact split amounts must sum to the expense total.");
      }

      return split.participants.map((participant) => ({ uid: participant.uid, amountMinor: participant.amountMinor }));
    }

    case "shares": {
      const allocated = allocateMinorUnits(
        amountMinor,
        split.participants.map((participant) => participant.shares)
      );

      return split.participants.map((participant, index) => ({
        uid: participant.uid,
        amountMinor: allocated[index]
      }));
    }

    case "percent": {
      const total = split.participants.reduce((sum, participant) => sum + participant.basisPoints, 0);
      if (total !== 10_000) {
        throw new Error("Percent splits must sum to 100%.");
      }

      const allocated = allocateMinorUnits(
        amountMinor,
        split.participants.map((participant) => participant.basisPoints)
      );

      return split.participants.map((participant, index) => ({
        uid: participant.uid,
        amountMinor: allocated[index]
      }));
    }
  }
}

export function computeExpenseDeltas(entry: ExpenseEntry): DeltaMap {
  const deltas: DeltaMap = {};
  addDelta(deltas, entry.payerUid, entry.amount.amountMinor);

  for (const participant of splitExpenseAmount(entry.amount.amountMinor, entry.split)) {
    addDelta(deltas, participant.uid, -participant.amountMinor);
  }

  return deltas;
}
