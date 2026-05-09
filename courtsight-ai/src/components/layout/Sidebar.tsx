"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { WatchlistPanel } from "./WatchlistPanel";

const NAV = [
  { href: "/", label: "Dashboard", icon: "◎" },
  { href: "/players", label: "Players", icon: "◍" },
  { href: "/scoreboard", label: "Today's games", icon: "▦" },
  { href: "/compare", label: "Compare", icon: "⇄" },
  { href: "/accuracy", label: "Accuracy", icon: "◉" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-white/5 bg-ink-900/60 backdrop-blur-md">
      <div className="px-5 py-5 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-accent-cyan to-accent-purple text-ink-950 font-bold">
            C
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">CourtSight</p>
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              AI Analytics · v2.2
            </p>
          </div>
        </Link>
      </div>
      <nav className="px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                active
                  ? "bg-white/[0.06] text-white"
                  : "text-white/60 hover:text-white hover:bg-white/[0.04]",
              )}
            >
              <span className="text-accent-cyan">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-5 pt-2 pb-1 text-[10px] uppercase tracking-widest text-white/30 border-t border-white/5">
        Watchlist
      </div>
      <div className="flex-1 overflow-y-auto pb-3">
        <WatchlistPanel />
      </div>
      <div className="px-5 py-4 border-t border-white/5 text-[11px] text-white/40 leading-relaxed">
        Analysis & projections only.
        <br />
        Not betting advice.
      </div>
    </aside>
  );
}
