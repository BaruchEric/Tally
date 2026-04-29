"use client";

import { useFirestoreCollection } from "@/src/hooks/useFirestoreSnapshot";
import { auditForLedgerQuery, normalizeAuditDoc } from "@/src/lib/ledgers/queries";
import { demoAuditLogs, demoLedger, type AuditLog } from "@/src/lib/ledgers/schema";

export function useAuditLogs(ledgerId: string) {
  const { data, loading, error } = useFirestoreCollection<AuditLog>({
    buildQuery: (db) => auditForLedgerQuery(db, ledgerId),
    mapDoc: (snapshot) => normalizeAuditDoc(snapshot.id, snapshot.data()),
    deps: [ledgerId],
    demo: { match: ledgerId === demoLedger.id, data: demoAuditLogs }
  });

  return { auditLogs: data, loading, error };
}
