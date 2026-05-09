import Image from "next/image";
import { cn } from "@/lib/utils/cn";

const SIZE_PX: Record<NonNullable<PlayerAvatarProps["size"]>, number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 80,
  xl: 112,
};

interface PlayerAvatarProps {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  ring?: boolean;
}

export function PlayerAvatar({
  src,
  name,
  size = "md",
  className,
  ring,
}: PlayerAvatarProps) {
  const dim = SIZE_PX[size];
  const initials =
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-accent-cyan/30 to-accent-purple/30 grid place-items-center text-white font-semibold",
        ring && "ring-1 ring-white/10",
        className,
      )}
      style={{ width: dim, height: dim }}
    >
      <span
        className="absolute inset-0 grid place-items-center select-none"
        style={{ fontSize: Math.max(10, dim * 0.36) }}
        aria-hidden
      >
        {initials}
      </span>
      {src && (
        <Image
          src={src}
          alt={name}
          width={dim}
          height={dim}
          className="relative z-10 object-cover"
          unoptimized
        />
      )}
    </div>
  );
}
