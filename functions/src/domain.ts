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
  split?: {
    mode: "equal" | "exact" | "shares" | "percent";
    participants: Array<string | { uid: string; amountMinor?: number; shares?: number; basisPoints?: number }>;
  };
};

export type DeltaMap = Record<string, number>;

function addDelta(deltas: DeltaMap, uid: string, amountMinor: number) {
  deltas[uid] = (deltas[uid] ?? 0) + amountMinor;
}

function uidForParticipant(participant: string | { uid: string }) {
  return typeof participant === "string" ? participant : participant.uid;
}

export function allocateMinorUnits(amountMinor: number, weights: number[]) {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (weights.length === 0 || totalWeight <= 0) {
    throw new Error("Invalid split.");
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

  for (const allocation of [...allocations].sort((left, right) => right.remainder - left.remainder)) {
    if (remainder <= 0) {
      break;
    }

    allocation.amountMinor += 1;
    remainder -= 1;
  }

  return allocations.sort((left, right) => left.index - right.index).map((allocation) => allocation.amountMinor);
}

function expenseDeltas(entry: FunctionEntry) {
  if (!entry.payerUid || !entry.split) {
    throw new Error("Expense entry is missing payer or split.");
  }

  const deltas: DeltaMap = {};
  addDelta(deltas, entry.payerUid, entry.amount.amountMinor);

  if (entry.split.mode === "equal") {
    const participants = entry.split.participants.map(uidForParticipant);
    const allocations = allocateMinorUnits(entry.amount.amountMinor, participants.map(() => 1));
    participants.forEach((uid, index) => addDelta(deltas, uid, -allocations[index]));
    return deltas;
  }

  if (entry.split.mode === "exact") {
    for (const participant of entry.split.participants) {
      if (typeof participant === "string" || participant.amountMinor === undefined) {
        throw new Error("Exact split participant is missing amount.");
      }
      addDelta(deltas, participant.uid, -participant.amountMinor);
    }
    return deltas;
  }

  const weights = entry.split.participants.map((participant) => {
    if (typeof participant === "string") {
      return 1;
    }
    return entry.split?.mode === "percent" ? (participant.basisPoints ?? 0) : (participant.shares ?? 0);
  });
  const allocations = allocateMinorUnits(entry.amount.amountMinor, weights);
  entry.split.participants.forEach((participant, index) => addDelta(deltas, uidForParticipant(participant), -allocations[index]));
  return deltas;
}

export function entryDeltas(entry: FunctionEntry) {
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

export function computeNet(entries: FunctionEntry[]) {
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

export function diff(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const changed: Record<string, { before: unknown; after: unknown }> = {};

  for (const key of keys) {
    const left = before?.[key];
    const right = after?.[key];
    if (JSON.stringify(left) !== JSON.stringify(right)) {
      changed[key] = { before: left, after: right };
    }
  }

  return changed;
}
