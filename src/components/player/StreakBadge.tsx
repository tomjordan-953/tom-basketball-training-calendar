import { Badge } from "@/components/ui/Badge";
import type { GameLog } from "@/types/stats";

/**
 * Detect a hot or cold streak: consecutive recent games > or < season avg
 * by a comfortable margin. Returns null if no streak is meaningful.
 */
export function StreakBadge({
  logs,
  seasonPpg,
}: {
  logs: GameLog[];
  seasonPpg: number;
}) {
  if (!seasonPpg || logs.length < 3) return null;
  const ordered = [...logs].sort((a, b) => (a.date < b.date ? 1 : -1));
  let hot = 0;
  let cold = 0;
  for (const g of ordered) {
    if (g.minutes < 10) break; // DNPs reset
    if (g.points > seasonPpg * 1.1) {
      if (cold > 0) break;
      hot++;
    } else if (g.points < seasonPpg * 0.85) {
      if (hot > 0) break;
      cold++;
    } else {
      break;
    }
  }
  if (hot >= 3) {
    return (
      <Badge tone="positive" dot>
        🔥 Hot streak · {hot} straight {">"} season avg
      </Badge>
    );
  }
  if (cold >= 3) {
    return (
      <Badge tone="danger" dot>
        ❄ Cold streak · {cold} straight below
      </Badge>
    );
  }
  return null;
}
