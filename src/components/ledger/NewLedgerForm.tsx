"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select } from "@/src/components/ui/select";
import { useAuth } from "@/src/lib/auth/AuthProvider";
import { getFirestoreDb } from "@/src/lib/firebase/client";
import { createLedger } from "@/src/lib/ledgers/queries";
import { SUPPORTED_CURRENCIES } from "@/src/lib/money";

const formSchema = z.object({
  name: z.string().trim().min(1),
  currency: z.string().length(3)
});

type FormValues = z.infer<typeof formSchema>;

export function NewLedgerForm() {
  const router = useRouter();
  const { user, configured } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      currency: "USD"
    }
  });

  async function onSubmit(values: FormValues) {
    const db = getFirestoreDb();
    if (!db || !user) {
      setMessage(configured ? "Sign in to create a ledger." : "Demo mode keeps the sample ledger active.");
      return;
    }

    try {
      const ledgerId = await createLedger({
        db,
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        name: values.name,
        currency: values.currency
      });
      router.push(`/ledgers/${ledgerId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create ledger.");
    }
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>New ledger</CardTitle>
        <CardDescription>Name the shared tab and choose its display currency.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...form.register("name")} placeholder="Roommates" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="currency">Currency</Label>
            <Select id="currency" {...form.register("currency")}>
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          </div>
          {message ? <p className="rounded-md bg-[var(--surface-soft)] p-3 text-sm text-[var(--muted)]">{message}</p> : null}
          <Button disabled={form.formState.isSubmitting} type="submit">
            Create ledger
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
