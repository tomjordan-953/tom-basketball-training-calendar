import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { getProviderStatus } from "@/lib/data/providers";

export default function NotFound() {
  const status = getProviderStatus();
  const liveAndDemoMismatch = status.isLive;
  return (
    <EmptyState
      title="No player found"
      description={
        liveAndDemoMismatch
          ? "This URL might be a leftover demo ID from before you connected the live API. Search by name to find the live player."
          : "The player ID you opened isn't available from the current data source."
      }
      action={
        <Link href="/players">
          <Button variant="outline" size="sm">
            Back to player search
          </Button>
        </Link>
      }
    />
  );
}
