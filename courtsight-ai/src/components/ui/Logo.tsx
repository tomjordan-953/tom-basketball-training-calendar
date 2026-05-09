"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

const SIZE_PX = { sm: 24, md: 32, lg: 48, xl: 64 } as const;

/**
 * CourtSight logo.
 *
 * Drop a custom SVG/PNG into `public/logo.svg` (or `public/logo.png`) to
 * replace the bundled mark. The image config in next.config.mjs already
 * permits any host. To use a remote logo, pass `src` directly.
 */
export function Logo({
  size = "md",
  src = "/logo.svg",
  className,
}: {
  size?: keyof typeof SIZE_PX;
  src?: string;
  className?: string;
}) {
  const dim = SIZE_PX[size];
  const [errored, setErrored] = useState(false);
  if (errored) {
    // Fallback: same shape using inline SVG so the brand always renders.
    return <FallbackMark dim={dim} className={className} />;
  }
  return (
    <Image
      src={src}
      alt="CourtSight AI"
      width={dim}
      height={dim}
      className={cn("inline-block shrink-0 rounded-xl", className)}
      onError={() => setErrored(true)}
      priority
      unoptimized
    />
  );
}

function FallbackMark({ dim, className }: { dim: number; className?: string }) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-xl bg-gradient-to-br from-accent-cyan to-accent-purple text-ink-950 font-bold",
        className,
      )}
      style={{ width: dim, height: dim, fontSize: dim * 0.5 }}
    >
      C
    </span>
  );
}
