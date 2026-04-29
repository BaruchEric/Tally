import type { Metadata } from "next";

import { InviteAcceptance } from "@/src/components/invites/InviteAcceptance";

export const metadata: Metadata = {
  title: "Invite"
};

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InviteAcceptance inviteId={id} />;
}
