import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[3px] border border-transparent px-1.5 py-0.5 text-[11px] leading-none font-bold uppercase tracking-[0.02em] whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-[#dcdfe4] text-[#44546f] dark:bg-[#38414a] dark:text-[#b6c2cf] [a]:hover:bg-secondary/80",
        destructive:
          "bg-[#ffeceb] text-[#ae2e24] dark:bg-[#42221f] dark:text-[#fd9891] focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        success:
          "bg-[#dcfff1] text-[#216e4e] dark:bg-[#1c3329] dark:text-[#7ee2b8] focus-visible:ring-success/20 dark:bg-success/20 dark:focus-visible:ring-success/40 [a]:hover:bg-success/20",
        warning:
          "bg-[#fff7d6] text-[#a54800] dark:bg-[#332e1b] dark:text-[#f8e6a0] focus-visible:ring-warning/20 dark:bg-warning/20 dark:focus-visible:ring-warning/40 [a]:hover:bg-warning/20",
        info:
          "bg-[#e9f2ff] text-[#0055cc] dark:bg-[#1c2b41] dark:text-[#85b8ff] focus-visible:ring-info/20 dark:bg-info/20 dark:focus-visible:ring-info/40 [a]:hover:bg-info/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        violet:
          "bg-[#f3f0ff] text-[#5e4db2] dark:bg-[#2b273f] dark:text-[#b8acf6] focus-visible:ring-violet-500/20 dark:bg-violet-500/20 dark:text-violet-400 dark:focus-visible:ring-violet-500/40 [a]:hover:bg-violet-500/20",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
