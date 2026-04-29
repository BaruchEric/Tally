"use client";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Something went wrong</CardTitle>
        <CardDescription>{error.message || "Unexpected error."}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => reset()}>Try again</Button>
      </CardContent>
    </Card>
  );
}
