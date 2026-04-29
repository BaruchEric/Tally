import type { Metadata } from "next";

import { EntryForm } from "@/src/components/ledger/EntryForm";

export const metadata: Metadata = {
  title: "New entry"
};

export default async function NewEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EntryForm ledgerId={id} />;
}
