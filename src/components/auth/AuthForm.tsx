"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Chrome, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { useAuth } from "@/src/lib/auth/AuthProvider";

const authSchema = z.object({
  displayName: z.string().min(2).optional().or(z.literal("")),
  email: z.string().email(),
  password: z.string().min(8)
});

type AuthValues = z.infer<typeof authSchema>;

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const { configured, signInWithEmail, signInWithGoogle, signUpWithEmail } = useAuth();
  const [message, setMessage] = useState<string | null>(configured ? null : "Firebase env is empty. Demo data is active.");
  const form = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: ""
    }
  });

  const isSignUp = mode === "sign-up";

  async function onSubmit(values: AuthValues) {
    setMessage(null);
    try {
      if (isSignUp) {
        await signUpWithEmail(values.email, values.password, values.displayName || values.email.split("@")[0]);
        router.push("/verify");
      } else {
        await signInWithEmail(values.email, values.password);
        router.push("/");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to authenticate.");
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{isSignUp ? "Create account" : "Sign in"}</CardTitle>
        <CardDescription>{isSignUp ? "Start a Tally ledger." : "Return to your ledgers."}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          {isSignUp ? (
            <div className="grid gap-2">
              <Label htmlFor="displayName">Name</Label>
              <Input id="displayName" {...form.register("displayName")} autoComplete="name" />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} autoComplete="email" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...form.register("password")}
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </div>
          {message ? <p className="rounded-md bg-[var(--surface-soft)] p-3 text-sm text-[var(--muted)]">{message}</p> : null}
          <Button disabled={!configured || form.formState.isSubmitting} type="submit">
            <Mail className="h-4 w-4" />
            {isSignUp ? "Create account" : "Sign in"}
          </Button>
          <Button
            disabled={!configured || form.formState.isSubmitting}
            onClick={() => {
              void signInWithGoogle()
                .then(() => router.push("/"))
                .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Google sign-in failed."));
            }}
            type="button"
            variant="secondary"
          >
            <Chrome className="h-4 w-4" />
            Google
          </Button>
          <p className="text-center text-sm text-[var(--muted)]">
            {isSignUp ? "Already have an account? " : "Need an account? "}
            <Link className="font-semibold text-[var(--primary)]" href={isSignUp ? "/sign-in" : "/sign-up"}>
              {isSignUp ? "Sign in" : "Sign up"}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
