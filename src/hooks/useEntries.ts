"use client";

import { onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { getFirestoreDb } from "@/src/lib/firebase/client";
import { demoEntries, demoLedger, type LedgerEntry } from "@/src/lib/ledgers/schema";
import { entriesForLedgerQuery, normalizeEntryDoc } from "@/src/lib/ledgers/queries";

export function useEntries(ledgerId: string) {
  const [entries, setEntries] = useState<LedgerEntry[]>(ledgerId === demoLedger.id ? demoEntries : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    const db = getFirestoreDb();
    if (!db || ledgerId === demoLedger.id) {
      return undefined;
    }

    return onSnapshot(
      entriesForLedgerQuery(db, ledgerId),
      { includeMetadataChanges: true },
      (snapshot) => {
        setEntries(snapshot.docs.map((entry) => normalizeEntryDoc(entry.id, entry.data())));
        setHasPendingWrites(snapshot.metadata.hasPendingWrites);
        setFromCache(snapshot.metadata.fromCache);
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );
  }, [ledgerId]);

  return { entries, loading, error, hasPendingWrites, fromCache };
}
