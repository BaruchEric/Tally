import type { LedgerEntry, LedgerMember } from "@/src/lib/ledgers/schema";

function csvCell(value: string | number | undefined | null) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function nameFor(uid: string, members: LedgerMember[]) {
  return members.find((member) => member.uid === uid)?.displayName ?? uid;
}

export function entriesToCsv(entries: LedgerEntry[], members: LedgerMember[]) {
  const headers = ["date", "type", "description", "payer/from", "to", "amountMinor", "currency", "participants", "note"];
  const rows = entries.map((entry) => {
    const participants =
      entry.type === "expense"
        ? entry.split.mode === "equal"
          ? entry.split.participants.map((uid) => nameFor(uid, members)).join("; ")
          : entry.split.participants.map((participant) => nameFor(participant.uid, members)).join("; ")
        : "";

    return [
      entry.date,
      entry.type,
      entry.description,
      entry.type === "expense"
        ? nameFor(entry.payerUid, members)
        : entry.type === "transfer"
          ? nameFor(entry.fromUid, members)
          : nameFor(entry.targetUid, members),
      entry.type === "transfer" ? nameFor(entry.toUid, members) : "",
      entry.amount.amountMinor,
      entry.amount.currency,
      participants,
      entry.note
    ];
  });

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
