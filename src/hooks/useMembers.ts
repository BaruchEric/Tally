"use client";

import { useFirestoreCollection } from "@/src/hooks/useFirestoreSnapshot";
import { membersCollection } from "@/src/lib/ledgers/queries";
import { demoLedger, demoMembers, type LedgerMember } from "@/src/lib/ledgers/schema";

export function useMembers(ledgerId: string) {
  const { data, loading, error } = useFirestoreCollection<LedgerMember>({
    buildQuery: (db) => membersCollection(db, ledgerId),
    mapDoc: (snapshot) => ({ ...(snapshot.data() as LedgerMember), uid: snapshot.id }),
    deps: [ledgerId],
    demo: { match: ledgerId === demoLedger.id, data: demoMembers }
  });

  return { members: data, loading, error };
}
