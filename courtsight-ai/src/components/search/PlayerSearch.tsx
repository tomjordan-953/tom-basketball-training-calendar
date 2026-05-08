"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Player } from "@/types/player";
import { cn } from "@/lib/utils/cn";

export function PlayerSearch({
  initialQuery = "",
  autoFocus = false,
}: {
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { players: Player[] };
        setResults(data.players.slice(0, 8));
        setOpen(true);
      } catch (err) {
        if ((err as { name?: string }).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div ref={wrapRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) router.push(`/players?q=${encodeURIComponent(q.trim())}`);
        }}
        className="relative"
      >
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
          ⌕
        </span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search NBA players… try Shai, Jokic, Luka"
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan/40"
        />
      </form>
      {open && (q.trim().length >= 2) && (
        <div className="absolute left-0 right-0 mt-2 rounded-xl border border-white/10 bg-ink-850/95 backdrop-blur-xl shadow-glass overflow-hidden z-50">
          {loading && (
            <p className="px-4 py-3 text-xs text-white/40">Searching…</p>
          )}
          {!loading && results.length === 0 && (
            <p className="px-4 py-3 text-xs text-white/40">No matches.</p>
          )}
          {results.map((p) => (
            <Link
              key={p.id}
              href={`/players/${encodeURIComponent(p.id)}`}
              className={cn(
                "flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/[0.05] border-b border-white/5 last:border-0",
              )}
              onClick={() => setOpen(false)}
            >
              <span className="text-white">{p.fullName}</span>
              <span className="text-xs text-white/40">
                {p.teamAbbreviation ?? "—"}
                {p.position ? ` · ${p.position}` : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
