import type { Metadata } from "next";

import { MembersManager } from "@/src/components/ledger/MembersManager";

export const metadata: Metadata = {
  title: "Members"
};

export default async function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Members</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Access, roles, and invites.</p>
      </div>
      <MembersManager ledgerId={id} />
    </div>
  );
}
