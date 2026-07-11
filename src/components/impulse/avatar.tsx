"use client";

import { avatarGradient, initialsFrom } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/db";

interface AvatarProps {
  profile?: Profile | null;
  name?: string;
  seed?: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
  ring?: boolean;
}

const SIZE_MAP = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

const DOT_SIZE = {
  xs: "h-2 w-2",
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
  lg: "h-3.5 w-3.5",
  xl: "h-4 w-4",
};

export function Avatar({
  profile,
  name,
  seed,
  src,
  size = "md",
  online,
  className,
  ring,
}: AvatarProps) {
  const displayName = profile?.display_name || name || "?";
  const avatarSrc = src ?? profile?.avatar_url ?? null;
  const gradientSeed = seed || profile?.username || profile?.id || displayName;

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        className={cn(
          "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-semibold text-white",
          SIZE_MAP[size],
          avatarGradient(gradientSeed),
          ring && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
        )}
      >
        {avatarSrc ? (
          <img src={avatarSrc} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <span>{initialsFrom(displayName)}</span>
        )}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-background",
            DOT_SIZE[size],
            online ? "bg-[var(--online)]" : "bg-muted-foreground/40"
          )}
        />
      )}
    </div>
  );
}
