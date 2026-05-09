// Provider factory. Imported only by server components and route handlers,
// so the API key in process.env never ships to the client bundle.
import { createBalldontlieProvider } from "./balldontlieProvider";
import { createDemoProvider } from "./demoProvider";
import { createEspnProvider } from "./espnProvider";
import type { ProviderMode, SportsDataProvider } from "./providerTypes";

let cached: SportsDataProvider | null = null;

function readMode(): ProviderMode {
  const raw = (process.env.DATA_PROVIDER ?? "auto").toLowerCase().trim();
  if (raw === "demo" || raw === "balldontlie" || raw === "espn") return raw;
  return "auto";
}

export function getProvider(): SportsDataProvider {
  if (cached) return cached;
  const mode = readMode();
  const apiKey = process.env.BALLDONTLIE_API_KEY?.trim();
  const apiKeyConfigured = Boolean(apiKey);

  if (mode === "demo") {
    cached = createDemoProvider({
      mode,
      apiKeyConfigured,
      reason: "DATA_PROVIDER=demo — running on bundled sample data.",
    });
    return cached;
  }

  if (mode === "espn") {
    cached = createEspnProvider("espn");
    return cached;
  }

  if (mode === "balldontlie") {
    if (!apiKey) {
      cached = createDemoProvider({
        mode,
        apiKeyConfigured,
        reason: "DATA_PROVIDER=balldontlie but BALLDONTLIE_API_KEY missing — falling back to Demo Mode.",
      });
      return cached;
    }
    cached = createBalldontlieProvider(apiKey, mode);
    return cached;
  }

  // auto: prefer ESPN (free, has live stats); fall back to balldontlie if user
  // explicitly wants it via DATA_PROVIDER, then demo.
  cached = createEspnProvider("auto");
  return cached;
}

export function getProviderStatus() {
  return getProvider().status;
}

export function resetProviderForTests() {
  cached = null;
}
