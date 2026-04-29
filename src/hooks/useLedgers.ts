"use client";

import { useFirestoreCollection } from "@/src/hooks/useFirestoreSnapshot";
import { useUser } from "@/src/lib/auth/useUser";
import { ledgersForUserQuery, normalizeLedgerDoc } from "@/src/lib/ledgers/queries";
import { demoLedger, type Ledger } from "@/src/lib/ledgers/schema";

export function useLedgers() {
  const { user, configured } = useUser();
  const uid = user?.uid;

  const { data, loading, error } = useFirestoreCollection<Ledger>({
    buildQuery: (db) => (uid ? ledgersForUserQuery(db, uid) : null),
    mapDoc: (snapshot) => normalizeLedgerDoc(snapshot.id, snapshot.data()),
    deps: [uid],
    demo: { match: !configured, data: [demoLedger] }
  });

  return { ledgers: data, loading, error };
}
