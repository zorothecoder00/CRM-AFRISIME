import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// La carte "neutre" reste blanche/quasi-blanche : c'est ce blanc qui la
// detache du fond de page (--background est deja gris-bleute). La colorer
// legerement la fondait dans ce fond au lieu de s'en detacher — d'ou un fond
// et une ombre entierement definis par variante (jamais superposes), et des
// teintes d'accent nettement plus marquees (14% au lieu de 5-8%) pour qu'un
// accent se voie vraiment. La barre en tete de carte (accent=...) permet de
// coder une signification (retard, en attente, info...) au niveau de la
// carte entiere, pas seulement d'un badge interne.
const cardVariants = cva(
  "group/card relative flex flex-col gap-(--card-spacing) overflow-hidden rounded-2xl border-t-4 py-(--card-spacing) text-sm text-card-foreground ring-1 ring-foreground/[0.1] transition-all [--card-spacing:--spacing(4)] hover:ring-foreground/[0.16] has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(3)] data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl",
  {
    variants: {
      accent: {
        none: "border-t-transparent bg-card shadow-[0_1px_2px_rgb(0_0_0/0.05),0_14px_28px_-18px_rgb(0_0_0/0.16)] hover:shadow-[0_2px_4px_rgb(0_0_0/0.06),0_18px_34px_-16px_rgb(0_0_0/0.22)]",
        primary:
          "border-t-primary bg-[linear-gradient(180deg,color-mix(in_oklch,var(--card),var(--primary)_14%),var(--card)_60%)] shadow-[0_1px_2px_rgb(0_0_0/0.05),0_16px_32px_-18px_color-mix(in_oklch,var(--primary),transparent_58%)] hover:shadow-[0_2px_4px_rgb(0_0_0/0.06),0_20px_38px_-16px_color-mix(in_oklch,var(--primary),transparent_45%)]",
        info: "border-t-info bg-[linear-gradient(180deg,color-mix(in_oklch,var(--card),var(--info)_14%),var(--card)_60%)] shadow-[0_1px_2px_rgb(0_0_0/0.05),0_16px_32px_-18px_color-mix(in_oklch,var(--info),transparent_58%)] hover:shadow-[0_2px_4px_rgb(0_0_0/0.06),0_20px_38px_-16px_color-mix(in_oklch,var(--info),transparent_45%)]",
        success:
          "border-t-success bg-[linear-gradient(180deg,color-mix(in_oklch,var(--card),var(--success)_14%),var(--card)_60%)] shadow-[0_1px_2px_rgb(0_0_0/0.05),0_16px_32px_-18px_color-mix(in_oklch,var(--success),transparent_58%)] hover:shadow-[0_2px_4px_rgb(0_0_0/0.06),0_20px_38px_-16px_color-mix(in_oklch,var(--success),transparent_45%)]",
        warning:
          "border-t-warning bg-[linear-gradient(180deg,color-mix(in_oklch,var(--card),var(--warning)_14%),var(--card)_60%)] shadow-[0_1px_2px_rgb(0_0_0/0.05),0_16px_32px_-18px_color-mix(in_oklch,var(--warning),transparent_58%)] hover:shadow-[0_2px_4px_rgb(0_0_0/0.06),0_20px_38px_-16px_color-mix(in_oklch,var(--warning),transparent_45%)]",
        destructive:
          "border-t-destructive bg-[linear-gradient(180deg,color-mix(in_oklch,var(--card),var(--destructive)_14%),var(--card)_60%)] shadow-[0_1px_2px_rgb(0_0_0/0.05),0_16px_32px_-18px_color-mix(in_oklch,var(--destructive),transparent_58%)] hover:shadow-[0_2px_4px_rgb(0_0_0/0.06),0_20px_38px_-16px_color-mix(in_oklch,var(--destructive),transparent_45%)]",
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
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
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
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
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
        "flex items-center rounded-b-xl border-t bg-muted/50 p-(--card-spacing)",
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
