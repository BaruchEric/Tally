"use client";

import { doc } from "firebase/firestore";

import { useFirestoreDoc } from "@/src/hooks/useFirestoreSnapshot";
import { normalizeLedgerDoc } from "@/src/lib/ledgers/queries";
import { demoLedger, type Ledger } from "@/src/lib/ledgers/schema";

export function useLedger(ledgerId: string) {
  const { data, loading, error } = useFirestoreDoc<Ledger>({
    buildRef: (db) => doc(db, "ledgers", ledgerId),
    mapDoc: (id, data) => normalizeLedgerDoc(id, data),
    deps: [ledgerId],
    demo: { match: ledgerId === demoLedger.id, data: demoLedger }
  });

  return { ledger: data, loading, error };
}
