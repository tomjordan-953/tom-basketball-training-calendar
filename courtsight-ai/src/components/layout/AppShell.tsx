import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { getProviderStatus } from "@/lib/data/providers";

export function AppShell({ children }: { children: ReactNode }) {
  const status = getProviderStatus();
  return (
    <div className="min-h-screen flex bg-grid-fade">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar status={status} />
        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8 max-w-[1500px] w-full mx-auto">
          {children}
        </main>
        <footer className="px-4 lg:px-8 py-6 text-xs text-white/30 border-t border-white/5">
          CourtSight AI · Sports analytics & projections. Not affiliated with the
          NBA. This tool provides analysis and is not betting advice.
        </footer>
      </div>
    </div>
  );
}
