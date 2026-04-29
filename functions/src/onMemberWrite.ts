import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

export const onMemberWrite = onDocumentWritten("ledgers/{ledgerId}/members/{uid}", async (event) => {
  const ledgerId = event.params.ledgerId;
  const uid = event.params.uid;
  const before = event.data?.before.exists ? event.data.before.data() : null;
  const after = event.data?.after.exists ? event.data.after.data() : null;

  const wasActive = before ? !before.removedAt : false;
  const isActive = after ? !after.removedAt : false;

  if (wasActive === isActive) {
    return;
  }

  const db = getFirestore();
  const ledgerRef = db.doc(`ledgers/${ledgerId}`);

  try {
    await ledgerRef.set(
      {
        memberUids: isActive ? FieldValue.arrayUnion(uid) : FieldValue.arrayRemove(uid),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    logger.error("onMemberWrite failed", { ledgerId, uid, error });
  }
});
