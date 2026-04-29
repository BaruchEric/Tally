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
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
  type WriteBatch
} from "firebase/firestore";

import {
  auditLogSchema,
  entrySchema,
  inviteSchema,
  ledgerSchema,
  type AdjustmentEntry,
  type AuditLog,
  type ExpenseEntry,
  type Invite,
  type Ledger,
  type LedgerEntry,
  type LedgerMember,
  type LedgerRole,
  type TransferEntry
} from "@/src/lib/ledgers/schema";

type NewLedgerEntry =
  | Omit<ExpenseEntry, "id" | "ledgerId">
  | Omit<TransferEntry, "id" | "ledgerId">
  | Omit<AdjustmentEntry, "id" | "ledgerId">;

type LedgerEntryPatch =
  | Partial<Omit<ExpenseEntry, "id" | "ledgerId" | "type">>
  | Partial<Omit<TransferEntry, "id" | "ledgerId" | "type">>
  | Partial<Omit<AdjustmentEntry, "id" | "ledgerId" | "type">>;

const ENTRY_PAGE_SIZE = 1000;

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
  return query(
    entriesCollection(db, ledgerId),
    where("deletedAt", "==", null),
    orderBy("date", "desc"),
    limit(ENTRY_PAGE_SIZE)
  );
}

export function pendingInvitesForEmailQuery(db: Firestore, email: string) {
  return query(invitesCollection(db), where("email", "==", email.toLowerCase()), where("status", "==", "pending"));
}

function appendAuditEntry(
  batch: WriteBatch,
  db: Firestore,
  ledgerId: string,
  fields: {
    actorUid: string;
    action: AuditLog["action"];
    targetPath: string;
    before?: unknown;
    after?: unknown;
  }
) {
  batch.set(doc(ledgerAuditCollection(db, ledgerId)), {
    ...fields,
    createdAt: serverTimestamp()
  });
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
  appendAuditEntry(batch, db, ledgerRef.id, {
    actorUid: uid,
    action: "create",
    targetPath: ledgerRef.path,
    after: { name, currency: currency.toUpperCase() }
  });

  await batch.commit();
  return ledgerRef.id;
}

export async function renameLedger(db: Firestore, ledgerId: string, uid: string, name: string) {
  const batch = writeBatch(db);
  batch.update(ledgerDoc(db, ledgerId), {
    name,
    updatedAt: serverTimestamp()
  });
  appendAuditEntry(batch, db, ledgerId, {
    actorUid: uid,
    action: "update",
    targetPath: `ledgers/${ledgerId}`,
    after: { name }
  });
  await batch.commit();
}

export async function softDeleteLedger(db: Firestore, ledgerId: string, uid: string) {
  const batch = writeBatch(db);
  batch.update(ledgerDoc(db, ledgerId), {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  appendAuditEntry(batch, db, ledgerId, {
    actorUid: uid,
    action: "delete",
    targetPath: `ledgers/${ledgerId}`
  });
  await batch.commit();
}

export async function setLedgerArchived(db: Firestore, ledgerId: string, uid: string, archived: boolean) {
  const batch = writeBatch(db);
  batch.update(ledgerDoc(db, ledgerId), {
    archivedAt: archived ? serverTimestamp() : null,
    updatedAt: serverTimestamp()
  });
  appendAuditEntry(batch, db, ledgerId, {
    actorUid: uid,
    action: "update",
    targetPath: `ledgers/${ledgerId}`,
    after: { archived }
  });
  await batch.commit();
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
    expiresAt: Timestamp.fromMillis(Date.now() + 1000 * 60 * 60 * 24 * 14),
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
  appendAuditEntry(batch, db, ledgerId, {
    actorUid,
    action: "member-change",
    targetPath: `ledgers/${ledgerId}/members/${memberUid}`,
    after: { removedAt: true }
  });

  await batch.commit();
}

export async function addLedgerEntry(db: Firestore, ledgerId: string, entry: NewLedgerEntry) {
  const entryRef = doc(entriesCollection(db, ledgerId));
  const batch = writeBatch(db);
  batch.set(entryRef, {
    ...entry,
    ledgerId,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  batch.update(ledgerDoc(db, ledgerId), { updatedAt: serverTimestamp() });
  await batch.commit();
  return entryRef.id;
}

export async function updateLedgerEntry(
  db: Firestore,
  ledgerId: string,
  entryId: string,
  actorUid: string,
  patch: LedgerEntryPatch
) {
  const entryRef = doc(db, "ledgers", ledgerId, "entries", entryId);
  const before = await getDoc(entryRef);
  const batch = writeBatch(db);

  batch.update(entryRef, {
    ...patch,
    updatedAt: serverTimestamp()
  });
  appendAuditEntry(batch, db, ledgerId, {
    actorUid,
    action: "update",
    targetPath: entryRef.path,
    before: before.exists() ? before.data() : null,
    after: patch
  });

  await batch.commit();
}

export async function softDeleteEntry(db: Firestore, ledgerId: string, entryId: string, actorUid: string) {
  const entryRef = doc(db, "ledgers", ledgerId, "entries", entryId);
  const before = await getDoc(entryRef);
  const batch = writeBatch(db);

  batch.update(entryRef, {
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  appendAuditEntry(batch, db, ledgerId, {
    actorUid,
    action: "delete",
    targetPath: entryRef.path,
    before: before.exists() ? before.data() : null,
    after: { deletedAt: true }
  });

  await batch.commit();
}

export async function clearArchivedFlag(db: Firestore, ledgerId: string) {
  await updateDoc(ledgerDoc(db, ledgerId), {
    archivedAt: deleteField(),
    updatedAt: serverTimestamp()
  });
}

export async function loadLedgerMembers(db: Firestore, ledgerId: string) {
  const snapshot = await getDocs(membersCollection(db, ledgerId));
  return snapshot.docs.map((memberDoc) => ({ ...(memberDoc.data() as LedgerMember), uid: memberDoc.id }));
}

export function normalizeLedgerDoc(id: string, data: DocumentData): Ledger {
  return ledgerSchema.parse({ id, ...data });
}

export function normalizeEntryDoc(id: string, data: DocumentData): LedgerEntry {
  return entrySchema.parse({ id, ...data });
}

export function normalizeAuditDoc(id: string, data: DocumentData): AuditLog {
  return auditLogSchema.parse({ id, ...data });
}

export function normalizeInviteDoc(id: string, data: DocumentData): Invite {
  return inviteSchema.parse({ id, ...data });
}
