import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

export const onMemberWrite = onDocumentWritten("ledgers/{ledgerId}/members/{uid}", async (event) => {
  const ledgerId = event.params.ledgerId;
  const db = getFirestore();
  const ledgerRef = db.doc(`ledgers/${ledgerId}`);
  const members = await ledgerRef.collection("members").get();
  const memberUids = members.docs
    .filter((member) => !member.data().removedAt)
    .map((member) => member.id)
    .sort();

  await ledgerRef.set(
    {
      memberUids,
      updatedAt: FieldValue.serverTimestamp()
    },
    { merge: true }
  );
});
