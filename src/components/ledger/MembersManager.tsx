"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select } from "@/src/components/ui/select";
import { useMembers } from "@/src/hooks/useMembers";
import { useAuth } from "@/src/lib/auth/AuthProvider";
import { getFirestoreDb } from "@/src/lib/firebase/client";
import { createInvite, removeMember } from "@/src/lib/ledgers/queries";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["editor", "viewer"])
});

type InviteValues = z.infer<typeof inviteSchema>;

export function MembersManager({ ledgerId }: { ledgerId: string }) {
  const { user, configured } = useAuth();
  const { members } = useMembers(ledgerId);
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "editor"
    }
  });

  async function onInvite(values: InviteValues) {
    const db = getFirestoreDb();
    if (!db || !user) {
      setMessage(configured ? "Sign in to invite members." : "Demo mode keeps members read-only.");
      return;
    }

    const inviteId = await createInvite({
      db,
      ledgerId,
      email: values.email,
      role: values.role,
      invitedBy: user.uid
    });
    setMessage(`Invite created: ${inviteId}`);
    form.reset();
  }

  async function onRemove(memberUid: string) {
    const db = getFirestoreDb();
    if (!db || !user) {
      setMessage(configured ? "Sign in to remove members." : "Demo mode keeps members read-only.");
      return;
    }

    await removeMember(db, ledgerId, user.uid, memberUid);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Owners can manage roles and removals.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {members.map((member) => (
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-[var(--border)] bg-white p-3" key={member.uid}>
              <div className="min-w-0">
                <p className="truncate font-medium">{member.displayName ?? member.email ?? member.uid}</p>
                <p className="truncate text-sm text-[var(--muted)]">{member.email ?? member.uid}</p>
              </div>
              <Badge>{member.role}</Badge>
              <Button
                aria-label={`Remove ${member.displayName ?? member.uid}`}
                disabled={member.role === "owner"}
                onClick={() => void onRemove(member.uid)}
                size="icon"
                title="Remove member"
                variant="ghost"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Invite</CardTitle>
          <CardDescription>Email invite with ledger role.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={form.handleSubmit(onInvite)}>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select id="role" {...form.register("role")}>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </Select>
            </div>
            {message ? <p className="rounded-md bg-[var(--surface-soft)] p-3 text-sm text-[var(--muted)]">{message}</p> : null}
            <Button disabled={form.formState.isSubmitting} type="submit">
              <MailPlus className="h-4 w-4" />
              Send invite
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
