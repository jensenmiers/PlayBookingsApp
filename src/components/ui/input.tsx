import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-secondary-50/40 selection:bg-primary-400/20 selection:text-secondary-50 border-secondary-50/10 flex h-11 w-full min-w-0 rounded-lg border bg-secondary-800 px-4 py-2 text-base text-secondary-50 shadow-xs transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-primary-400 focus-visible:ring-primary-400/30 focus-visible:ring-[3px]",
        "hover:border-secondary-50/20 aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
