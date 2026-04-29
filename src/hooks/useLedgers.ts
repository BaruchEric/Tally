"use client";

import { onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { useUser } from "@/src/lib/auth/useUser";
import { getFirestoreDb } from "@/src/lib/firebase/client";
import { demoLedger, type Ledger } from "@/src/lib/ledgers/schema";
import { ledgersForUserQuery, normalizeLedgerDoc } from "@/src/lib/ledgers/queries";

export function useLedgers() {
  const { user, configured } = useUser();
  const [ledgers, setLedgers] = useState<Ledger[]>(configured ? [] : [demoLedger]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const db = getFirestoreDb();
    if (!db || !user) {
      return undefined;
    }

    return onSnapshot(
      ledgersForUserQuery(db, user.uid),
      (snapshot) => {
        setLedgers(snapshot.docs.map((ledger) => normalizeLedgerDoc(ledger.id, ledger.data())));
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );
  }, [user]);

  return { ledgers, loading, error };
}
