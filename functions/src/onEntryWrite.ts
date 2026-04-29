import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

import { computeNet, diff, type FunctionEntry } from "./domain.js";

export const onEntryWrite = onDocumentWritten("ledgers/{ledgerId}/entries/{entryId}", async (event) => {
  const ledgerId = event.params.ledgerId;
  const entryId = event.params.entryId;
  const db = getFirestore();
  const ledgerRef = db.doc(`ledgers/${ledgerId}`);

  try {
    const entriesSnap = await ledgerRef.collection("entries").where("deletedAt", "==", null).get();
    const entries = entriesSnap.docs.map((doc) => doc.data() as FunctionEntry);
    const net = computeNet(entries);
    const batch = db.batch();

    for (const [uid, amountMinor] of Object.entries(net)) {
      batch.set(
        ledgerRef.collection("balances").doc(uid),
        {
          net: amountMinor,
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }

    const before = event.data?.before.exists ? (event.data.before.data() as Record<string, unknown>) : null;
    const after = event.data?.after.exists ? (event.data.after.data() as Record<string, unknown>) : null;
    const actorUid = String(after?.createdBy ?? before?.createdBy ?? "system");
    const wasDeleted = Boolean(before?.deletedAt);
    const isDeleted = Boolean(after?.deletedAt);
    const action = !before
      ? "create"
      : !after
        ? "delete"
        : !wasDeleted && isDeleted
          ? "delete"
          : "update";

    // Deterministic audit doc id keyed off event.id so retries don't duplicate.
    batch.set(ledgerRef.collection("audit").doc(event.id), {
      actorUid,
      action,
      targetPath: `ledgers/${ledgerId}/entries/${entryId}`,
      before,
      after,
      diff: diff(before, after),
      createdAt: FieldValue.serverTimestamp()
    });
    batch.update(ledgerRef, { updatedAt: FieldValue.serverTimestamp() });

    await batch.commit();
  } catch (error) {
    logger.error("onEntryWrite failed", { ledgerId, entryId, error });
  }
});
