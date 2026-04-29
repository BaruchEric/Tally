import type { Metadata } from "next";

import { EntryDetail } from "@/src/components/ledger/EntryDetail";

export const metadata: Metadata = {
  title: "Entry"
};

export default async function EntryPage({ params }: { params: Promise<{ id: string; entryId: string }> }) {
  const { id, entryId } = await params;
  return <EntryDetail entryId={entryId} ledgerId={id} />;
}
