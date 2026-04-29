"use client";

import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { getFirestoreDb } from "@/src/lib/firebase/client";
import { demoLedger, type Ledger } from "@/src/lib/ledgers/schema";
import { normalizeLedgerDoc } from "@/src/lib/ledgers/queries";

export function useLedger(ledgerId: string) {
  const [ledger, setLedger] = useState<Ledger | null>(ledgerId === demoLedger.id ? demoLedger : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const db = getFirestoreDb();
    if (!db || ledgerId === demoLedger.id) {
      return undefined;
    }

    return onSnapshot(
      doc(db, "ledgers", ledgerId),
      (snapshot) => {
        setLedger(snapshot.exists() ? normalizeLedgerDoc(snapshot.id, snapshot.data()) : null);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );
  }, [ledgerId]);

  return { ledger, loading, error };
}
