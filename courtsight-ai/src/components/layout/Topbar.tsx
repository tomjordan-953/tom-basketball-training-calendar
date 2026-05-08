import { PlayerSearch } from "@/components/search/PlayerSearch";
import { Badge } from "@/components/ui/Badge";
import type { ProviderStatus } from "@/lib/data/providers/providerTypes";

export function Topbar({ status }: { status: ProviderStatus }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/80 backdrop-blur-xl">
      <div className="flex items-center gap-4 px-4 lg:px-8 py-3">
        <div className="lg:hidden flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent-cyan to-accent-purple text-ink-950 font-bold">
            C
          </span>
          <span className="text-sm font-semibold text-white">CourtSight</span>
        </div>
        <div className="flex-1 max-w-2xl">
          <PlayerSearch />
        </div>
        <div className="hidden sm:block">
          <Badge tone={status.isLive ? "positive" : "info"} dot>
            {status.label}
          </Badge>
        </div>
      </div>
    </header>
  );
}
