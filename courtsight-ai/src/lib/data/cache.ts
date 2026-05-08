// Lightweight in-memory cache with TTL, timestamped meta, and in-flight
// request deduplication. Self-contained so the app needs zero infra.
// A Prisma/SQLite-backed implementation is sketched in prisma/schema.prisma
// for v3 persistence.

interface Entry<T> {
  value: T;
  storedAt: number;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export const TTL = {
  player: 24 * 60 * 60 * 1000,
  gameLogs: 6 * 60 * 60 * 1000,
  seasonAverages: 6 * 60 * 60 * 1000,
  search: 12 * 60 * 60 * 1000,
  projection: 45 * 60 * 1000,
  status: 5 * 60 * 1000,
} as const;

export interface CacheMeta {
  storedAt: number;
  ageMs: number;
  fresh: boolean;
}

export interface CacheRead<T> {
  value: T;
  meta: CacheMeta;
}

export function cacheGet<T>(key: string): CacheRead<T> | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  const ageMs = Date.now() - hit.storedAt;
  return {
    value: hit.value as T,
    meta: { storedAt: hit.storedAt, ageMs, fresh: ageMs < 60_000 },
  };
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): CacheMeta {
  const storedAt = Date.now();
  store.set(key, { value, storedAt, expiresAt: storedAt + ttlMs });
  return { storedAt, ageMs: 0, fresh: true };
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit) return hit.value;
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const promise = (async () => {
    try {
      const fresh = await fn();
      cacheSet(key, fresh, ttlMs);
      return fresh;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

export async function cachedWithMeta<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<CacheRead<T>> {
  const hit = cacheGet<T>(key);
  if (hit) return hit;
  const value = await cached(key, ttlMs, fn);
  return cacheGet<T>(key) ?? {
    value,
    meta: { storedAt: Date.now(), ageMs: 0, fresh: true },
  };
}

export function cacheClear(): void {
  store.clear();
  inflight.clear();
}

export function cacheStats() {
  return { entries: store.size, inflight: inflight.size };
}

export function formatCacheAge(ageMs: number): string {
  if (ageMs < 30_000) return "just now";
  if (ageMs < 60_000) return `${Math.round(ageMs / 1000)}s ago`;
  if (ageMs < 3600_000) return `${Math.round(ageMs / 60_000)}m ago`;
  if (ageMs < 86_400_000) return `${Math.round(ageMs / 3600_000)}h ago`;
  return `${Math.round(ageMs / 86_400_000)}d ago`;
}
