import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/15 text-primary",
        secondary: "border-border/50 bg-secondary text-secondary-foreground",
        destructive: "border-destructive/20 bg-destructive/15 text-destructive",
        outline: "border-border text-foreground bg-transparent",
        success: "border-emerald-500/20 bg-emerald-500/15 text-emerald-400",
        warning: "border-amber-500/20 bg-amber-500/15 text-amber-400",
        accent: "border-accent/20 bg-accent/15 text-accent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
