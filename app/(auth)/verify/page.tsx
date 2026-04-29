import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";

export const metadata: Metadata = {
  title: "Verify email"
};

export default function VerifyPage() {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Verify email</CardTitle>
        <CardDescription>Check your inbox, then return to Tally.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link href="/">Continue</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
