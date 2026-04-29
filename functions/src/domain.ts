// NOTE: This is a server-side mirror of `src/lib/ledgers/{schema,splits,balances}.ts`.
// Functions runs as its own bundle (separate tsconfig), so direct import is not possible.
// Behavior MUST stay aligned with the client; see splits.ts / balances.ts when changing.

export type FunctionParticipant =
  | string
  | { uid: string; amountMinor?: number; shares?: number; basisPoints?: number };

export type FunctionSplit = {
  mode: "equal" | "exact" | "shares" | "percent";
  participants: FunctionParticipant[];
};

export type FunctionEntry = {
  type: "expense" | "transfer" | "adjustment";
  createdBy: string;
  deletedAt?: unknown;
  date: string;
  amount: {
    amountMinor: number;
    currency: string;
  };
  payerUid?: string;
  fromUid?: string;
  toUid?: string;
  targetUid?: string;
  split?: FunctionSplit;
};

export type DeltaMap = Record<string, number>;

function addDelta(deltas: DeltaMap, uid: string, amountMinor: number) {
  deltas[uid] = (deltas[uid] ?? 0) + amountMinor;
}

function uidForParticipant(participant: FunctionParticipant): string {
  return typeof participant === "string" ? participant : participant.uid;
}

export function allocateMinorUnits(amountMinor: number, weights: number[]): number[] {
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

function expenseDeltas(entry: FunctionEntry): DeltaMap {
  if (!entry.payerUid || !entry.split) {
    throw new Error("Expense entry is missing payer or split.");
  }

  const split = entry.split;
  const deltas: DeltaMap = {};
  addDelta(deltas, entry.payerUid, entry.amount.amountMinor);

  if (split.mode === "equal") {
    const participants = split.participants.map(uidForParticipant);
    const allocated = allocateMinorUnits(entry.amount.amountMinor, participants.map(() => 1));
    participants.forEach((uid, index) => addDelta(deltas, uid, -allocated[index]));
    return deltas;
  }

  if (split.mode === "exact") {
    let total = 0;
    for (const participant of split.participants) {
      if (typeof participant === "string" || participant.amountMinor === undefined) {
        throw new Error("Exact split participant is missing amount.");
      }

      total += participant.amountMinor;
      addDelta(deltas, participant.uid, -participant.amountMinor);
    }

    if (total !== entry.amount.amountMinor) {
      throw new Error("Exact split amounts must sum to the expense total.");
    }

    return deltas;
  }

  const weights = split.participants.map((participant) => {
    if (typeof participant === "string") {
      throw new Error(`${split.mode} split requires participant objects with weights.`);
    }

    const weight = split.mode === "percent" ? participant.basisPoints : participant.shares;
    if (weight === undefined) {
      throw new Error(`${split.mode} split participant is missing a weight.`);
    }

    return weight;
  });

  if (split.mode === "percent" && weights.reduce((sum, weight) => sum + weight, 0) !== 10_000) {
    throw new Error("Percent splits must sum to 100%.");
  }

  const allocated = allocateMinorUnits(entry.amount.amountMinor, weights);
  split.participants.forEach((participant, index) => addDelta(deltas, uidForParticipant(participant), -allocated[index]));
  return deltas;
}

export function entryDeltas(entry: FunctionEntry): DeltaMap {
  if (entry.type === "expense") {
    return expenseDeltas(entry);
  }

  if (entry.type === "transfer") {
    if (!entry.fromUid || !entry.toUid) {
      throw new Error("Transfer entry is missing endpoints.");
    }

    return {
      [entry.fromUid]: entry.amount.amountMinor,
      [entry.toUid]: -entry.amount.amountMinor
    };
  }

  if (!entry.targetUid) {
    throw new Error("Adjustment entry is missing target.");
  }

  return {
    [entry.targetUid]: entry.amount.amountMinor
  };
}

export function computeNet(entries: FunctionEntry[]): DeltaMap {
  const net: DeltaMap = {};

  for (const entry of entries) {
    if (entry.deletedAt) {
      continue;
    }

    const deltas = entryDeltas(entry);
    for (const [uid, amountMinor] of Object.entries(deltas)) {
      addDelta(net, uid, amountMinor);
    }
  }

  return net;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (typeof (value as { toMillis?: () => number }).toMillis === "function") {
    return JSON.stringify((value as { toMillis: () => number }).toMillis());
  }

  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

export function diff(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changed: Record<string, { before: unknown; after: unknown }> = {};

  for (const key of keys) {
    const left = before?.[key];
    const right = after?.[key];
    if (stableStringify(left) !== stableStringify(right)) {
      changed[key] = { before: left, after: right };
    }
  }

  return changed;
}
