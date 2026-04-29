import { getEntryParticipants, getMemberName } from "@/src/lib/ledgers/members";
import type { LedgerEntry, LedgerMember } from "@/src/lib/ledgers/schema";

function csvCell(value: string | number | undefined | null) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function payerOrFromName(entry: LedgerEntry, members: LedgerMember[]) {
  if (entry.type === "expense") return getMemberName(entry.payerUid, members);
  if (entry.type === "transfer") return getMemberName(entry.fromUid, members);
  return getMemberName(entry.targetUid, members);
}

export function entriesToCsv(entries: LedgerEntry[], members: LedgerMember[]) {
  const headers = ["date", "type", "description", "payer/from", "to", "amountMinor", "currency", "participants", "note"];
  const rows = entries.map((entry) => {
    const participantUids = entry.type === "expense" ? getEntryParticipants(entry).slice(1) : [];
    const participants = participantUids.map((uid) => getMemberName(uid, members)).join("; ");

    return [
      entry.date,
      entry.type,
      entry.description,
      payerOrFromName(entry, members),
      entry.type === "transfer" ? getMemberName(entry.toUid, members) : "",
      entry.amount.amountMinor,
      entry.amount.currency,
      participants,
      entry.note
    ];
  });

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}
