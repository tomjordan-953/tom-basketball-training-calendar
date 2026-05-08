import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <EmptyState
      title="No player found"
      description="The player ID you opened isn't available from the current data source."
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
