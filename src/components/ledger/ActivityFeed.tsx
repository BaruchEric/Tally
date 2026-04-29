"use client";

import { History } from "lucide-react";

import type { AuditLog, LedgerMember } from "@/src/lib/ledgers/schema";
import { getMemberName } from "@/src/lib/ledgers/members";

function auditTime(value: unknown) {
  if (typeof value === "string") {
    return new Date(value).toLocaleString();
  }

  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toLocaleString();
  }

  return "";
}

function changedKeys(log: AuditLog) {
  if (log.diff && typeof log.diff === "object") {
    return Object.keys(log.diff);
  }

  if (log.after && typeof log.after === "object") {
    return Object.keys(log.after);
  }

  return [];
}

export function ActivityFeed({
  auditLogs,
  members,
  emptyLabel = "No activity yet."
}: {
  auditLogs: AuditLog[];
  members: LedgerMember[];
  emptyLabel?: string;
}) {
  if (auditLogs.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {auditLogs.map((log) => {
        const keys = changedKeys(log);
        return (
          <div className="grid gap-1 rounded-md border border-[var(--border)] bg-white p-3 text-sm" key={log.id}>
            <div className="flex items-center gap-2 font-medium">
              <History className="h-4 w-4 text-[var(--primary)]" />
              <span>{getMemberName(log.actorUid, members)}</span>
              <span className="text-[var(--muted)]">{log.action}</span>
            </div>
            <div className="truncate text-[var(--muted)]">{log.targetPath}</div>
            {keys.length > 0 ? <div className="text-xs text-[var(--muted)]">Changed: {keys.join(", ")}</div> : null}
            <div className="text-xs text-[var(--muted)]">{auditTime(log.createdAt)}</div>
          </div>
        );
      })}
    </div>
  );
}
