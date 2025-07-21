import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

type HoverAvatarProps = React.HTMLAttributes<HTMLDivElement> & {
  src: string;
  alt: string;
  fallback: string;
  name?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
};

export function HoverAvatar({
  className,
  src,
  alt,
  fallback,
  name,
  description,
  size = "md",
  ...props
}: HoverAvatarProps) {
  const sizeClass = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className={cn("cursor-pointer", className)} {...props}>
          <Avatar className={sizeClass[size]}>
            <AvatarImage src={src} alt={alt} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
        </div>
      </HoverCardTrigger>
      {(name || description) && (
        <HoverCardContent className="w-60 bg-surface border-surface-light">
          <div className="flex flex-col gap-2">
            <Avatar className="h-12 w-12">
              <AvatarImage src={src} alt={alt} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            {name && <p className="font-medium">{name}</p>}
            {description && <p className="text-sm text-gray-400">{description}</p>}
          </div>
        </HoverCardContent>
      )}
    </HoverCard>
  );
}
