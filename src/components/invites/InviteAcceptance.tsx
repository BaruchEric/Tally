"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { useAuth } from "@/src/lib/auth/AuthProvider";
import { getFirestoreDb } from "@/src/lib/firebase/client";
import { acceptInvite } from "@/src/lib/ledgers/queries";

export function InviteAcceptance({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const { user, configured } = useAuth();
  const [message, setMessage] = useState<string | null>(null);

  async function onAccept() {
    const db = getFirestoreDb();
    if (!db || !user) {
      setMessage(configured ? "Sign in to accept this invite." : "Demo mode cannot accept invites.");
      return;
    }

    const ledgerId = await acceptInvite({
      db,
      inviteId,
      uid: user.uid
    });
    router.push(`/ledgers/${ledgerId}`);
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Ledger invite</CardTitle>
        <CardDescription>{inviteId}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {message ? <p className="rounded-md bg-[var(--surface-soft)] p-3 text-sm text-[var(--muted)]">{message}</p> : null}
        <Button onClick={() => void onAccept()}>Accept invite</Button>
      </CardContent>
    </Card>
  );
}
