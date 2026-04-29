"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Archive, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { useLedger } from "@/src/hooks/useLedger";
import { useAuth } from "@/src/lib/auth/AuthProvider";
import { getFirestoreDb } from "@/src/lib/firebase/client";
import { renameLedger, setLedgerArchived, softDeleteLedger } from "@/src/lib/ledgers/queries";

const settingsSchema = z.object({
  name: z.string().trim().min(1)
});

type SettingsValues = z.infer<typeof settingsSchema>;

export function LedgerSettings({ ledgerId }: { ledgerId: string }) {
  const { user, configured } = useAuth();
  const { ledger } = useLedger(ledgerId);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    values: {
      name: ledger?.name ?? ""
    }
  });

  async function onSubmit(values: SettingsValues) {
    const db = getFirestoreDb();
    if (!db || !user) {
      setMessage(configured ? "Sign in to update settings." : "Demo mode keeps settings read-only.");
      return;
    }

    try {
      await renameLedger(db, ledgerId, user.uid, values.name);
      setMessage("Saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save settings.");
    }
  }

  async function onDelete() {
    const db = getFirestoreDb();
    if (!db || !user) {
      setMessage(configured ? "Sign in to delete the ledger." : "Demo mode keeps settings read-only.");
      return;
    }

    if (!window.confirm(`Delete ${ledger?.name ?? "this ledger"}? Members will lose access.`)) {
      return;
    }

    setPending(true);
    try {
      await softDeleteLedger(db, ledgerId, user.uid);
      setMessage("Ledger deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete ledger.");
    } finally {
      setPending(false);
    }
  }

  async function onArchive() {
    const db = getFirestoreDb();
    if (!db || !user) {
      setMessage(configured ? "Sign in to archive the ledger." : "Demo mode keeps settings read-only.");
      return;
    }

    setPending(true);
    try {
      await setLedgerArchived(db, ledgerId, user.uid, !ledger?.archivedAt);
      setMessage(ledger?.archivedAt ? "Ledger restored." : "Ledger archived.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not change archive state.");
    } finally {
      setPending(false);
    }
  }

  const busy = form.formState.isSubmitting || pending;

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Ledger settings</CardTitle>
        <CardDescription>{ledger?.currency ?? "USD"} display currency</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} />
          </div>
          {message ? <p className="rounded-md bg-[var(--surface-soft)] p-3 text-sm text-[var(--muted)]">{message}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} type="submit">
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button disabled={busy} onClick={() => void onArchive()} type="button" variant="secondary">
              <Archive className="h-4 w-4" />
              {ledger?.archivedAt ? "Unarchive" : "Archive"}
            </Button>
            <Button disabled={busy} onClick={() => void onDelete()} type="button" variant="destructive">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
