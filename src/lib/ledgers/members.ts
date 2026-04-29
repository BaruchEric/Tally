import type { LedgerEntry, LedgerMember } from "@/src/lib/ledgers/schema";

export function getMemberName(uid: string, members: LedgerMember[]) {
  return members.find((member) => member.uid === uid)?.displayName ?? uid;
}

export function getEntryParticipants(entry: LedgerEntry): string[] {
  if (entry.type === "expense") {
    const participantUids =
      entry.split.mode === "equal"
        ? entry.split.participants
        : entry.split.participants.map((participant) => participant.uid);
    return [entry.payerUid, ...participantUids];
  }

  if (entry.type === "transfer") {
    return [entry.fromUid, entry.toUid];
  }

  return [entry.targetUid];
}

export function formatEntryActor(entry: LedgerEntry, members: LedgerMember[]) {
  if (entry.type === "expense") {
    return getMemberName(entry.payerUid, members);
  }

  if (entry.type === "transfer") {
    return `${getMemberName(entry.fromUid, members)} to ${getMemberName(entry.toUid, members)}`;
  }

  return getMemberName(entry.targetUid, members);
}
