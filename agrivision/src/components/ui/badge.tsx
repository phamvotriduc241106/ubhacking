import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/25 bg-primary/10 text-primary",
        demo: "border-gold-500/40 bg-gold-400/15 text-gold-500 dark:text-gold-300",
        live: "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
        warning: "border-yellow-500/40 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
        critical: "border-red-500/40 bg-red-500/15 text-red-600 dark:text-red-300",
        outline: "border-border text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
