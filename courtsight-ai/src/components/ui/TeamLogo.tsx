import Image from "next/image";
import { cn } from "@/lib/utils/cn";

const SIZE_PX = { xs: 16, sm: 24, md: 36, lg: 48 } as const;

export function teamLogoUrl(abbreviation?: string | null): string | null {
  if (!abbreviation) return null;
  const slug = abbreviation.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nba/500/${slug}.png`;
}

export function TeamLogo({
  abbreviation,
  size = "md",
  className,
  src,
}: {
  abbreviation?: string | null;
  size?: keyof typeof SIZE_PX;
  className?: string;
  src?: string | null;
}) {
  const dim = SIZE_PX[size];
  const url = src || teamLogoUrl(abbreviation);
  if (!url) {
    return (
      <span
        className={cn(
          "inline-grid shrink-0 place-items-center rounded-lg bg-white/5 ring-1 ring-white/10 text-[10px] uppercase tracking-widest text-white/50 font-semibold",
          className,
        )}
        style={{ width: dim, height: dim }}
      >
        {abbreviation ?? "?"}
      </span>
    );
  }
  return (
    <Image
      src={url}
      alt={abbreviation ?? "team"}
      width={dim}
      height={dim}
      className={cn("inline-block shrink-0 object-contain", className)}
      unoptimized
    />
  );
}
