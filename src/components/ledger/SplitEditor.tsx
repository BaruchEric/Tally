"use client";

import { Users } from "lucide-react";

import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";

export function SplitEditor({
  participants,
  onParticipantsChange
}: {
  participants: string;
  onParticipantsChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="participants">Participants</Label>
      <div className="relative">
        <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          className="pl-9"
          id="participants"
          onChange={(event) => onParticipantsChange(event.target.value)}
          placeholder="alex, sam, riley"
          value={participants}
        />
      </div>
    </div>
  );
}
