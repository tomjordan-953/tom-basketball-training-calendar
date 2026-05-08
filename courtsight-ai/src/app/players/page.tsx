import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { getProvider } from "@/lib/data/providers";
import { PlayerSearch } from "@/components/search/PlayerSearch";
import { FEATURED_DEMO_IDS } from "@/lib/data/providers/demoProvider";

export const dynamic = "force-dynamic";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const provider = getProvider();
  const q = (searchParams.q ?? "").trim();
  let players = q ? await provider.searchPlayers(q) : [];
  if (!q && provider.name === "demo") {
    players = await provider.searchPlayers("");
  }
  if (!q && provider.name !== "demo") {
    // For live provider with no query, show featured demo IDs as suggestions
    // by querying common names.
    players = await provider.searchPlayers("james");
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">Players</h1>
          <p className="text-sm text-white/50 mt-1">
            {q
              ? `Showing results for “${q}”`
              : "Search a player or browse the demo roster."}
          </p>
        </div>
        <Badge tone={provider.status.isLive ? "positive" : "info"} dot>
          {provider.status.label}
        </Badge>
      </div>

      <Card>
        <CardBody>
          <PlayerSearch initialQuery={q} />
        </CardBody>
      </Card>

      {players.length === 0 ? (
        <EmptyState
          title="No players found"
          description={
            q
              ? "Try a different name. Make sure spelling is correct."
              : "Search for a player above."
          }
          action={
            <Link href="/">
              <Button variant="outline" size="sm">Back to dashboard</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((p) => (
            <Link
              key={p.id}
              href={`/players/${encodeURIComponent(p.id)}`}
              className="group"
            >
              <Card className="h-full transition group-hover:border-white/15 group-hover:translate-y-[-2px]">
                <CardHeader
                  title={p.fullName}
                  subtitle={[
                    p.team,
                    p.position,
                    p.height ? `${p.height}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  right={
                    p.teamAbbreviation ? (
                      <Badge tone="purple">{p.teamAbbreviation}</Badge>
                    ) : undefined
                  }
                />
                <CardBody className="text-xs text-white/50 flex items-center justify-between">
                  <span>
                    {FEATURED_DEMO_IDS.includes(p.id) ? "Featured" : "Tap to open profile"}
                  </span>
                  <span className="text-accent-cyan group-hover:translate-x-0.5 transition">
                    Open →
                  </span>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
