"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.22em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-border/70 bg-white/70 text-foreground",
        secondary: "border-border/70 bg-secondary/75 text-secondary-foreground",
        accent: "border-primary/20 bg-primary/10 text-primary-foreground",
        success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-900",
        warning: "border-amber-500/20 bg-amber-500/10 text-amber-900",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: Readonly<BadgeProps>) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}
