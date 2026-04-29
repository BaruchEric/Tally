import type { Metadata } from "next";

import { HomeDashboard } from "@/src/components/ledger/HomeDashboard";

export const metadata: Metadata = {
  title: "Ledgers"
};

export default function HomePage() {
  return <HomeDashboard />;
}
