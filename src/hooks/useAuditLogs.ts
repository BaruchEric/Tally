"use client";

import { onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

import { getFirestoreDb } from "@/src/lib/firebase/client";
import { auditForLedgerQuery, normalizeAuditDoc } from "@/src/lib/ledgers/queries";
import { demoAuditLogs, demoLedger, type AuditLog } from "@/src/lib/ledgers/schema";

export function useAuditLogs(ledgerId: string) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(ledgerId === demoLedger.id ? demoAuditLogs : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const db = getFirestoreDb();
    if (!db || ledgerId === demoLedger.id) {
      return undefined;
    }

    return onSnapshot(
      auditForLedgerQuery(db, ledgerId),
      (snapshot) => {
        setAuditLogs(snapshot.docs.map((log) => normalizeAuditDoc(log.id, log.data())));
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError);
        setLoading(false);
      }
    );
  }, [ledgerId]);

  return { auditLogs, loading, error };
}
