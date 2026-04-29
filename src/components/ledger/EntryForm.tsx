"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { SplitEditor } from "@/src/components/ledger/SplitEditor";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select } from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";
import { useMembers } from "@/src/hooks/useMembers";
import { useAuth } from "@/src/lib/auth/AuthProvider";
import { todayIsoDate } from "@/src/lib/dates";
import { getFirebaseStorage, getFirestoreDb } from "@/src/lib/firebase/client";
import { addLedgerEntry, updateLedgerEntry } from "@/src/lib/ledgers/queries";
import { getCurrencyExponent, parseMoneyInput } from "@/src/lib/money";

const formSchema = z.object({
  type: z.enum(["expense", "transfer"]),
  description: z.string().trim().min(1),
  amount: z.string().trim().min(1),
  currency: z.string().length(3),
  date: z.string().min(1),
  payerUid: z.string().trim().min(1),
  fromUid: z.string().trim().min(1),
  toUid: z.string().trim().min(1),
  participants: z.string().trim(),
  note: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

function minorToInput(amountMinor: string | null, currency: string) {
  if (!amountMinor || !/^\d+$/.test(amountMinor)) {
    return "";
  }

  const exponent = getCurrencyExponent(currency);
  return (Number.parseInt(amountMinor, 10) / 10 ** exponent).toFixed(exponent);
}

export function EntryForm({ ledgerId, currency = "USD" }: { ledgerId: string; currency?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, configured } = useAuth();
  const { members } = useMembers(ledgerId);
  const [message, setMessage] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const initialType = searchParams.get("type") === "transfer" ? "transfer" : "expense";
  const initialCurrency = searchParams.get("currency") ?? currency;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: initialType,
      description: initialType === "transfer" ? "Settle up" : "",
      amount: minorToInput(searchParams.get("amountMinor"), initialCurrency),
      currency: initialCurrency,
      date: todayIsoDate(),
      payerUid: "",
      fromUid: searchParams.get("from") ?? "",
      toUid: searchParams.get("to") ?? "",
      participants: "",
      note: ""
    }
  });
  const type = useWatch({ control: form.control, name: "type" });

  useEffect(() => {
    if (!user) {
      return;
    }

    const current = form.getValues();
    form.reset({
      ...current,
      payerUid: current.payerUid || user.uid,
      fromUid: current.fromUid || user.uid,
      participants: current.participants || user.uid
    });
  }, [user, form]);

  async function onSubmit(values: FormValues) {
    const db = getFirestoreDb();
    if (!db || !user) {
      setMessage(configured ? "Sign in to add entries." : "Demo mode keeps sample entries read-only.");
      return;
    }

    try {
      const amount = parseMoneyInput(values.amount, values.currency);
      if (values.type === "expense") {
        const participants = values.participants
          .split(",")
          .map((participant) => participant.trim())
          .filter(Boolean);

        const entryId = await addLedgerEntry(db, ledgerId, {
          type: "expense",
          createdBy: user.uid,
          payerUid: values.payerUid,
          amount,
          split: { mode: "equal", participants },
          date: values.date,
          description: values.description,
          note: values.note
        });

        const storage = getFirebaseStorage();
        if (receiptFile && storage) {
          const safeName = receiptFile.name.replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
          const receiptPath = `receipts/${ledgerId}/${entryId}/${safeName}`;
          const receiptRef = ref(storage, receiptPath);
          await uploadBytes(receiptRef, receiptFile, { contentType: receiptFile.type });
          const receiptURL = await getDownloadURL(receiptRef);
          await updateLedgerEntry(db, ledgerId, entryId, user.uid, { receiptPath, receiptURL });
        }
      } else {
        await addLedgerEntry(db, ledgerId, {
          type: "transfer",
          createdBy: user.uid,
          fromUid: values.fromUid,
          toUid: values.toUid,
          amount,
          date: values.date,
          description: values.description,
          note: values.note
        });
      }

      router.push(`/ledgers/${ledgerId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save entry.");
    }
  }

  const memberOptions = members.length > 0 ? members : (user ? [{ uid: user.uid, displayName: user.displayName ?? user.email ?? "You" }] : []);

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>New entry</CardTitle>
        <CardDescription>Expenses and transfers update balances in real time.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select id="type" {...form.register("type")}>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...form.register("date")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...form.register("description")} />
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" inputMode="decimal" {...form.register("amount")} placeholder="42.00" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" maxLength={3} {...form.register("currency")} />
            </div>
          </div>
          {type === "expense" ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="payerUid">Payer</Label>
                <Select id="payerUid" {...form.register("payerUid")}>
                  {memberOptions.map((member) => (
                    <option key={member.uid} value={member.uid}>
                      {member.displayName ?? member.uid}
                    </option>
                  ))}
                </Select>
              </div>
              <Controller
                control={form.control}
                name="participants"
                render={({ field }) => <SplitEditor onParticipantsChange={field.onChange} participants={field.value} />}
              />
            </>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="fromUid">From</Label>
                <Select id="fromUid" {...form.register("fromUid")}>
                  {memberOptions.map((member) => (
                    <option key={member.uid} value={member.uid}>
                      {member.displayName ?? member.uid}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="toUid">To</Label>
                <Select id="toUid" {...form.register("toUid")}>
                  {memberOptions.map((member) => (
                    <option key={member.uid} value={member.uid}>
                      {member.displayName ?? member.uid}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="note">Note</Label>
            <Textarea id="note" {...form.register("note")} />
          </div>
          {type === "expense" ? (
            <div className="grid gap-2">
              <Label htmlFor="receipt">Receipt</Label>
              <Input
                accept="image/png,image/jpeg,image/webp,application/pdf"
                id="receipt"
                onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </div>
          ) : null}
          {message ? <p className="rounded-md bg-[var(--surface-soft)] p-3 text-sm text-[var(--muted)]">{message}</p> : null}
          <Button disabled={form.formState.isSubmitting} type="submit">
            Save entry
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
