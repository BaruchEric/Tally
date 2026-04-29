"use client";

import { useFirestoreCollection } from "@/src/hooks/useFirestoreSnapshot";
import { entriesForLedgerQuery, normalizeEntryDoc } from "@/src/lib/ledgers/queries";
import { demoEntries, demoLedger, type LedgerEntry } from "@/src/lib/ledgers/schema";

export function useEntries(ledgerId: string) {
  const { data, loading, error, hasPendingWrites, fromCache } = useFirestoreCollection<LedgerEntry>({
    buildQuery: (db) => entriesForLedgerQuery(db, ledgerId),
    mapDoc: (snapshot) => normalizeEntryDoc(snapshot.id, snapshot.data()),
    deps: [ledgerId],
    demo: { match: ledgerId === demoLedger.id, data: demoEntries },
    listenOptions: { includeMetadataChanges: true }
  });

  return { entries: data, loading, error, hasPendingWrites, fromCache };
}
