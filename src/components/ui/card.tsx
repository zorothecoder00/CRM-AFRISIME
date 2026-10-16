import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Refonte « épurée façon Jira » : surface blanche, bordure fine, aucune
// ombre ni degrade. Un accent (retard, en attente, info...) se lit sur un
// liseré vertical de 3px a gauche — signal net sans teinter toute la carte.
const cardVariants = cva(
  "group/card relative flex flex-col gap-(--card-spacing) overflow-hidden rounded-lg border border-border border-l-[3px] bg-card py-(--card-spacing) text-sm text-card-foreground transition-colors [--card-spacing:--spacing(4)] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-lg *:[img:last-child]:rounded-b-lg",
  {
    variants: {
      accent: {
        none: "border-l-border",
        primary: "border-l-primary",
        info: "border-l-info",
        success: "border-l-success",
        warning: "border-l-warning",
        destructive: "border-l-destructive",
      },
    },
    defaultVariants: { accent: "none" },
  }
)

function Card({
  className,
  size = "default",
  accent,
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" } & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(cardVariants({ accent }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-lg px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-[15px] leading-snug font-semibold group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-lg border-t bg-surface-sunken p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export type CardAccent = NonNullable<VariantProps<typeof cardVariants>["accent"]>;

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
