"use client";

import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import { MailCheck, UserRound } from "lucide-react";
import { useState, type ChangeEvent } from "react";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { useAuth } from "@/src/lib/auth/AuthProvider";
import { getFirebaseStorage, getFirestoreDb } from "@/src/lib/firebase/client";

export function ProfilePanel() {
  const { user, configured, signOut } = useAuth();
  const [message, setMessage] = useState<string | null>(null);

  async function onAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const input = event.target;
    const storage = getFirebaseStorage();
    const db = getFirestoreDb();

    if (!file || !user || !storage || !db) {
      setMessage(configured ? "Sign in to upload an avatar." : "Demo mode keeps profile storage read-only.");
      input.value = "";
      return;
    }

    try {
      const extension = file.name.includes(".")
        ? (file.name.split(".").pop() ?? "jpg").toLowerCase()
        : "jpg";
      const avatarRef = ref(storage, `avatars/${user.uid}/avatar.${extension}`);
      await uploadBytes(avatarRef, file, { contentType: file.type });
      const photoURL = await getDownloadURL(avatarRef);
      await updateProfile(user, { photoURL });
      await setDoc(
        doc(db, "users", user.uid),
        {
          photoURL,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      setMessage("Avatar updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload avatar.");
    } finally {
      input.value = "";
    }
  }

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>{configured ? "Firebase account" : "Demo mode"}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-white p-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--surface-soft)]">
            {user?.photoURL ? (
              <Image
                alt=""
                className="h-12 w-12 rounded-md object-cover"
                height={48}
                src={user.photoURL}
                unoptimized
                width={48}
              />
            ) : (
              <UserRound className="h-6 w-6 text-[var(--primary)]" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{user?.displayName ?? "Demo user"}</span>
            <span className="block truncate text-sm text-[var(--muted)]">{user?.email ?? "demo@tally.local"}</span>
          </span>
        </div>
        {user?.emailVerified ? (
          <p className="rounded-md bg-[var(--surface-soft)] p-3 text-sm text-[var(--positive)]">
            <MailCheck className="mr-2 inline h-4 w-4" />
            Email verified.
          </p>
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="avatar">Avatar</Label>
          <Input
            accept="image/png,image/jpeg,image/webp"
            disabled={!user}
            id="avatar"
            onChange={(event) => void onAvatarChange(event)}
            type="file"
          />
        </div>
        {message ? <p className="rounded-md bg-[var(--surface-soft)] p-3 text-sm text-[var(--muted)]">{message}</p> : null}
        <div className="flex flex-wrap gap-2">
          {user ? (
            <Button onClick={() => void signOut()} variant="secondary">
              Sign out
            </Button>
          ) : (
            <Button asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
