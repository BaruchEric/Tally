import type { Metadata } from "next";

import { NewLedgerForm } from "@/src/components/ledger/NewLedgerForm";

export const metadata: Metadata = {
  title: "New ledger"
};

export default function NewLedgerPage() {
  return <NewLedgerForm />;
}
