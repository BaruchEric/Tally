import Link from "next/link";
import { CircleDollarSign } from "lucide-react";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="grid w-full gap-6">
        <Link className="mx-auto flex items-center gap-2 font-semibold" href="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[var(--primary)] text-white">
            <CircleDollarSign className="h-5 w-5" />
          </span>
          <span className="text-lg">Tally</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
