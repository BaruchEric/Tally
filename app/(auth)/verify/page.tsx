"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useReducer } from "react";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { useAuth } from "@/src/lib/auth/AuthProvider";

export default function VerifyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [, bumpReload] = useReducer((count: number) => count + 1, 0);
  const verified = Boolean(user?.emailVerified);

  useEffect(() => {
    if (!user || user.emailVerified) {
      return undefined;
    }

    function onFocus() {
      void user?.reload().then(() => bumpReload());
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user]);

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Verify email</CardTitle>
        <CardDescription>
          {verified ? "Email verified — you can continue." : "Check your inbox, then return to Tally."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {verified ? (
          <Button onClick={() => router.push("/")}>Continue</Button>
        ) : (
          <Button asChild>
            <Link href="/">Continue</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
