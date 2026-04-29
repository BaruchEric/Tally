import * as React from "react";

import { cn } from "@/src/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "focus-ring min-h-24 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm shadow-sm placeholder:text-[var(--muted)]",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
