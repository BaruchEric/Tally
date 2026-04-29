import * as React from "react";

import { cn } from "@/src/lib/utils";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      className={cn(
        "focus-ring h-10 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm shadow-sm",
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
