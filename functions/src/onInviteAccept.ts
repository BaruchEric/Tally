import { getFirestore, FieldValue } from "firebase-admin/firestore";
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
  batch.set(ledgerRef.collection("audit").doc(), {
    actorUid: uid,
    action: "accept-invite",
    targetPath: `invites/${event.params.inviteId}`,
    after: { uid, role: after.role ?? "viewer" },
    createdAt: FieldValue.serverTimestamp()
  });

  await batch.commit();
});
