import * as React from "react";
import { cn } from "@/lib/utils";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  border?: boolean;
}

export function GlassCard({
  className,
  children,
  border = true,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "glass-card rounded-2xl overflow-hidden",
        border ? "border border-surface-light/30" : "",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
