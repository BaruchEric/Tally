import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

export const onInviteAccept = onDocumentUpdated("invites/{inviteId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after || before.status === "accepted" || after.status !== "accepted" || !after.acceptedBy) {
    return;
  }

  const db = getFirestore();
  const ledgerRef = db.doc(`ledgers/${after.ledgerId}`);
  const uid = String(after.acceptedBy);

  try {
    const batch = db.batch();
    batch.set(
      ledgerRef.collection("members").doc(uid),
      {
        uid,
        role: after.role ?? "viewer",
        email: after.email ?? null,
        joinedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    );
    batch.update(ledgerRef, {
      memberUids: FieldValue.arrayUnion(uid),
      updatedAt: FieldValue.serverTimestamp()
    });
    batch.set(ledgerRef.collection("audit").doc(event.id), {
      actorUid: uid,
      action: "accept-invite",
      targetPath: `invites/${event.params.inviteId}`,
      after: { uid, role: after.role ?? "viewer" },
      createdAt: FieldValue.serverTimestamp()
    });

    await batch.commit();
  } catch (error) {
    logger.error("onInviteAccept failed", { inviteId: event.params.inviteId, error });
  }
});
