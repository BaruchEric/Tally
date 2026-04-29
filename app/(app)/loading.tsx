import { Card, CardContent } from "@/src/components/ui/card";

export default function Loading() {
  return (
    <Card>
      <CardContent className="p-6 text-sm text-[var(--muted)]">Loading…</CardContent>
    </Card>
  );
}
