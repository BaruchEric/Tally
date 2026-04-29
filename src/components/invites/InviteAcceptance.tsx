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
  const [pending, setPending] = useState(false);

  async function onAccept() {
    const db = getFirestoreDb();
    if (!db) {
      setMessage("Firebase is not configured.");
      return;
    }

    if (!user) {
      if (configured) {
        router.push(`/sign-in?next=${encodeURIComponent(`/invites/${inviteId}`)}`);
      } else {
        setMessage("Demo mode cannot accept invites.");
      }
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const ledgerId = await acceptInvite({ db, inviteId, uid: user.uid });
      router.push(`/ledgers/${ledgerId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not accept invite.");
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Ledger invite</CardTitle>
        <CardDescription>You were invited to join a shared Tally ledger.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {message ? <p className="rounded-md bg-[var(--surface-soft)] p-3 text-sm text-[var(--muted)]">{message}</p> : null}
        <Button disabled={pending} onClick={() => void onAccept()}>
          {pending ? "Accepting…" : "Accept invite"}
        </Button>
      </CardContent>
    </Card>
  );
}
