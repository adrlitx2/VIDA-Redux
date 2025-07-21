import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeGlowVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary/90 text-white shadow-neon-purple",
        secondary: "bg-secondary/90 text-white shadow-neon-teal",
        accent: "bg-accent/90 text-white shadow-neon-pink",
        destructive: "bg-destructive/90 text-white",
        outline: "border border-primary bg-transparent text-primary",
      },
      animation: {
        none: "",
        pulse: "animate-pulse",
        pulseSlow: "animate-pulse-slow",
      },
    },
    defaultVariants: {
      variant: "default",
      animation: "none",
    },
  }
);

export interface BadgeGlowProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeGlowVariants> {}

function BadgeGlow({
  className,
  variant,
  animation,
  ...props
}: BadgeGlowProps) {
  return (
    <div
      className={cn(badgeGlowVariants({ variant, animation }), className)}
      {...props}
    />
  );
}

export { BadgeGlow, badgeGlowVariants };
