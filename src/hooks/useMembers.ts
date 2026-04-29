"use client";

import { onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { getFirestoreDb } from "@/src/lib/firebase/client";
import { demoLedger, demoMembers, type LedgerMember } from "@/src/lib/ledgers/schema";
import { membersCollection } from "@/src/lib/ledgers/queries";

export function useMembers(ledgerId: string) {
  const [members, setMembers] = useState<LedgerMember[]>(ledgerId === demoLedger.id ? demoMembers : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const db = getFirestoreDb();
    if (!db || ledgerId === demoLedger.id) {
      return undefined;
    }

    return onSnapshot(
      membersCollection(db, ledgerId),
      (snapshot) => {
        setMembers(snapshot.docs.map((member) => ({ uid: member.id, ...member.data() }) as LedgerMember));
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );
  }, [ledgerId]);

  return { members, loading, error };
}
