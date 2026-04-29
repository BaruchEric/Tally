"use client";

import {
  addDoc,
  arrayRemove,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore
} from "firebase/firestore";

import type {
  AdjustmentEntry,
  ExpenseEntry,
  Invite,
  Ledger,
  LedgerEntry,
  LedgerMember,
  LedgerRole,
  TransferEntry
} from "@/src/lib/ledgers/schema";

type NewLedgerEntry =
  | Omit<ExpenseEntry, "id" | "ledgerId">
  | Omit<TransferEntry, "id" | "ledgerId">
  | Omit<AdjustmentEntry, "id" | "ledgerId">;

export function ledgersCollection(db: Firestore) {
  return collection(db, "ledgers");
}

export function ledgerDoc(db: Firestore, ledgerId: string) {
  return doc(db, "ledgers", ledgerId);
}

export function membersCollection(db: Firestore, ledgerId: string) {
  return collection(db, "ledgers", ledgerId, "members");
}

export function entriesCollection(db: Firestore, ledgerId: string) {
  return collection(db, "ledgers", ledgerId, "entries");
}

export function invitesCollection(db: Firestore) {
  return collection(db, "invites");
}

export function ledgerAuditCollection(db: Firestore, ledgerId: string) {
  return collection(db, "ledgers", ledgerId, "audit");
}

export function auditForLedgerQuery(db: Firestore, ledgerId: string) {
  return query(ledgerAuditCollection(db, ledgerId), orderBy("createdAt", "desc"), limit(50));
}

export function ledgersForUserQuery(db: Firestore, uid: string) {
  return query(
    ledgersCollection(db),
    where("memberUids", "array-contains", uid),
    where("deletedAt", "==", null),
    orderBy("updatedAt", "desc")
  );
}

export function entriesForLedgerQuery(db: Firestore, ledgerId: string) {
  return query(entriesCollection(db, ledgerId), where("deletedAt", "==", null), orderBy("date", "desc"), limit(200));
}

export function pendingInvitesForEmailQuery(db: Firestore, email: string) {
  return query(invitesCollection(db), where("email", "==", email.toLowerCase()), where("status", "==", "pending"));
}

export async function createLedger({
  db,
  uid,
  displayName,
  email,
  name,
  currency
}: {
  db: Firestore;
  uid: string;
  displayName?: string | null;
  email?: string | null;
  name: string;
  currency: string;
}) {
  const ledgerRef = doc(ledgersCollection(db));
  const member: LedgerMember = {
    uid,
    role: "owner",
    displayName,
    email,
    joinedAt: serverTimestamp()
  };

  const batch = writeBatch(db);
  batch.set(ledgerRef, {
    name,
    currency: currency.toUpperCase(),
    createdBy: uid,
    memberUids: [uid],
    archivedAt: null,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.set(doc(db, "ledgers", ledgerRef.id, "members", uid), member);
  batch.set(doc(ledgerAuditCollection(db, ledgerRef.id)), {
    actorUid: uid,
    action: "create",
    targetPath: ledgerRef.path,
    after: { name, currency: currency.toUpperCase() },
    createdAt: serverTimestamp()
  });

  await batch.commit();
  return ledgerRef.id;
}

export async function renameLedger(db: Firestore, ledgerId: string, uid: string, name: string) {
  await updateDoc(ledgerDoc(db, ledgerId), {
    name,
    updatedAt: serverTimestamp()
  });
  await addDoc(ledgerAuditCollection(db, ledgerId), {
    actorUid: uid,
    action: "update",
    targetPath: `ledgers/${ledgerId}`,
    after: { name },
    createdAt: serverTimestamp()
  });
}

export async function softDeleteLedger(db: Firestore, ledgerId: string, uid: string) {
  await updateDoc(ledgerDoc(db, ledgerId), {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await addDoc(ledgerAuditCollection(db, ledgerId), {
    actorUid: uid,
    action: "delete",
    targetPath: `ledgers/${ledgerId}`,
    createdAt: serverTimestamp()
  });
}

export async function setLedgerArchived(db: Firestore, ledgerId: string, uid: string, archived: boolean) {
  await updateDoc(ledgerDoc(db, ledgerId), {
    archivedAt: archived ? serverTimestamp() : null,
    updatedAt: serverTimestamp()
  });
  await addDoc(ledgerAuditCollection(db, ledgerId), {
    actorUid: uid,
    action: "update",
    targetPath: `ledgers/${ledgerId}`,
    after: { archived },
    createdAt: serverTimestamp()
  });
}

export async function createInvite({
  db,
  ledgerId,
  email,
  role,
  invitedBy
}: {
  db: Firestore;
  ledgerId: string;
  email: string;
  role: LedgerRole;
  invitedBy: string;
}) {
  const inviteRef = await addDoc(invitesCollection(db), {
    ledgerId,
    email: email.toLowerCase(),
    role,
    invitedBy,
    status: "pending",
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    createdAt: serverTimestamp()
  });

  return inviteRef.id;
}

export async function acceptInvite({
  db,
  inviteId,
  uid
}: {
  db: Firestore;
  inviteId: string;
  uid: string;
}) {
  const inviteRef = doc(db, "invites", inviteId);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) {
    throw new Error("Invite not found.");
  }

  const invite = inviteSnap.data() as Invite;
  if (invite.status !== "pending") {
    throw new Error("Invite is no longer pending.");
  }

  await updateDoc(inviteRef, {
    status: "accepted",
    acceptedBy: uid,
    acceptedAt: serverTimestamp()
  });
  return invite.ledgerId;
}

export async function removeMember(db: Firestore, ledgerId: string, actorUid: string, memberUid: string) {
  const batch = writeBatch(db);
  batch.update(doc(db, "ledgers", ledgerId, "members", memberUid), {
    removedAt: serverTimestamp()
  });
  batch.update(ledgerDoc(db, ledgerId), {
    memberUids: arrayRemove(memberUid),
    updatedAt: serverTimestamp()
  });
  batch.set(doc(ledgerAuditCollection(db, ledgerId)), {
    actorUid,
    action: "member-change",
    targetPath: `ledgers/${ledgerId}/members/${memberUid}`,
    after: { removedAt: true },
    createdAt: serverTimestamp()
  });

  await batch.commit();
}

export async function addLedgerEntry(db: Firestore, ledgerId: string, entry: NewLedgerEntry) {
  const entryRef = doc(entriesCollection(db, ledgerId));
  await setDoc(entryRef, {
    ...entry,
    ledgerId,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await updateDoc(ledgerDoc(db, ledgerId), { updatedAt: serverTimestamp() });
  return entryRef.id;
}

export async function updateLedgerEntry(
  db: Firestore,
  ledgerId: string,
  entryId: string,
  actorUid: string,
  patch: Partial<ExpenseEntry | TransferEntry>
) {
  const entryRef = doc(db, "ledgers", ledgerId, "entries", entryId);
  const before = await getDoc(entryRef);

  await updateDoc(entryRef, {
    ...patch,
    updatedAt: serverTimestamp()
  });
  await addDoc(ledgerAuditCollection(db, ledgerId), {
    actorUid,
    action: "update",
    targetPath: entryRef.path,
    before: before.exists() ? before.data() : null,
    after: patch,
    createdAt: serverTimestamp()
  });
}

export async function softDeleteEntry(db: Firestore, ledgerId: string, entryId: string, actorUid: string) {
  const entryRef = doc(db, "ledgers", ledgerId, "entries", entryId);
  const before = await getDoc(entryRef);
  await updateDoc(entryRef, {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await addDoc(ledgerAuditCollection(db, ledgerId), {
    actorUid,
    action: "delete",
    targetPath: entryRef.path,
    before: before.exists() ? before.data() : null,
    after: { deletedAt: true },
    createdAt: serverTimestamp()
  });
}

export async function clearArchivedFlag(db: Firestore, ledgerId: string) {
  await updateDoc(ledgerDoc(db, ledgerId), {
    archivedAt: deleteField(),
    updatedAt: serverTimestamp()
  });
}

export async function loadLedgerMembers(db: Firestore, ledgerId: string) {
  const snapshot = await getDocs(membersCollection(db, ledgerId));
  return snapshot.docs.map((memberDoc) => ({ uid: memberDoc.id, ...memberDoc.data() }) as LedgerMember);
}

export function normalizeLedgerDoc(id: string, data: Record<string, unknown>): Ledger {
  return {
    id,
    name: String(data.name ?? "Untitled ledger"),
    currency: String(data.currency ?? "USD").toUpperCase(),
    createdBy: String(data.createdBy ?? ""),
    memberUids: Array.isArray(data.memberUids) ? data.memberUids.map(String) : [],
    archivedAt: data.archivedAt,
    deletedAt: data.deletedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export function normalizeEntryDoc(id: string, data: Record<string, unknown>): LedgerEntry {
  return {
    id,
    ...(data as Omit<LedgerEntry, "id">)
  } as LedgerEntry;
}

export function normalizeAuditDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    actorUid: String(data.actorUid ?? "system"),
    action: data.action,
    targetPath: String(data.targetPath ?? ""),
    before: data.before,
    after: data.after,
    diff: data.diff,
    createdAt: data.createdAt
  } as import("@/src/lib/ledgers/schema").AuditLog;
}
