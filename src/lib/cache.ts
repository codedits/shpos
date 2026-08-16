/**
 * Enterprise Dual-Tier Cache Manager (L1 In-Memory + L2 LocalStorage)
 * Provides ultra-fast <1ms data retrieval, offline exception resilience, and smart invalidation.
 */

interface CacheEnvelope<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

// In-Memory L1 Cache Storage
const memoryCache = new Map<string, CacheEnvelope<any>>();

const DEFAULT_TTL_MS = 60 * 1000; // 1 minute default TTL

export const CacheKeys = {
  PRODUCTS: 'cache_wholesale_products',
  CUSTOMERS: 'cache_wholesale_customers',
  ORDERS: 'cache_wholesale_orders',
  PAYMENTS: 'cache_wholesale_payments',
  SETTINGS: 'cache_wholesale_settings',
} as const;

export const CACHE_TTL = {
  PRODUCTS: 2 * 60 * 1000, // 2 mins
  CUSTOMERS: 2 * 60 * 1000, // 2 mins
  ORDERS: 30 * 1000, // 30s
  PAYMENTS: 30 * 1000, // 30s
  SETTINGS: 10 * 60 * 1000, // 10 mins
};

export class CacheManager {
  /**
   * Clears all in-memory and local storage cache entries
   */
  static invalidateAll(): void {
    memoryCache.clear();
    if (typeof window !== 'undefined') {
      Object.values(CacheKeys).forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {}
      });
    }
  }
  /**
   * Safely retrieve item from L1 memory or L2 localStorage if still valid
   */
  static get<T>(key: string): T | null {
    const now = Date.now();

    // 1. Check L1 Memory Cache (Instant, 0 serialization overhead)
    const memItem = memoryCache.get(key);
    if (memItem) {
      if (now - memItem.timestamp <= memItem.ttlMs) {
        return memItem.data as T;
      }
      memoryCache.delete(key);
    }

    // 2. Check L2 LocalStorage
    if (typeof window === 'undefined') return null;

    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const envelope: CacheEnvelope<T> = JSON.parse(raw);
      if (now - envelope.timestamp <= envelope.ttlMs) {
        // Promote back to L1 Memory Cache
        memoryCache.set(key, envelope);
        return envelope.data;
      }

      // Expired in L2
      localStorage.removeItem(key);
      return null;
    } catch {
      // Corrupted storage entry
      try {
        localStorage.removeItem(key);
      } catch {}
      return null;
    }
  }

  /**
   * Save data into L1 Memory and L2 LocalStorage with TTL
   */
  static set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
    const envelope: CacheEnvelope<T> = {
      data,
      timestamp: Date.now(),
      ttlMs,
    };

    // 1. Store in L1
    memoryCache.set(key, envelope);

    // 2. Store in L2 LocalStorage
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(key, JSON.stringify(envelope));
    } catch (e: any) {
      // Handle QuotaExceededError by clearing old caches
      if (e?.name === 'QuotaExceededError' || e?.code === 22) {
        this.pruneExpired();
        try {
          localStorage.setItem(key, JSON.stringify(envelope));
        } catch {
          // Gracefully fallback to memory-only
        }
      }
    }
  }

  /**
   * Invalidate a single key or multiple keys from both tiers
   */
  static invalidate(keys: string | string[]): void {
    const keyList = Array.isArray(keys) ? keys : [keys];

    for (const key of keyList) {
      memoryCache.delete(key);
      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(key);
        } catch {}
      }
    }
  }

  /**
   * Invalidate all keys matching a given prefix
   */
  static invalidatePrefix(prefix: string): void {
    for (const k of Array.from(memoryCache.keys())) {
      if (k.startsWith(prefix)) {
        memoryCache.delete(k);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
  }

  /**
   * Clear all L1 and L2 application caches
   */
  static clear(): void {
    memoryCache.clear();
    this.invalidate([
      CacheKeys.PRODUCTS,
      CacheKeys.CUSTOMERS,
      CacheKeys.ORDERS,
      CacheKeys.PAYMENTS,
      CacheKeys.SETTINGS,
    ]);
  }

  /**
   * Stale-While-Revalidate & Exception-Resilient fetcher
   * Fetches fresh data while protecting against network drops, timeouts, and DB crashes.
   */
  static async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      ttlMs?: number;
      fallback?: T;
      forceRefresh?: boolean;
    }
  ): Promise<T> {
    const ttl = options?.ttlMs ?? DEFAULT_TTL_MS;

    // 1. Return fresh cached data if not forcing refresh
    if (!options?.forceRefresh) {
      const cached = this.get<T>(key);
      if (cached !== null && cached !== undefined) {
        return cached;
      }
    }

    // 2. Fetch fresh data from network / database
    try {
      const freshData = await fetcher();

      // Only cache valid non-null results
      if (freshData !== null && freshData !== undefined) {
        this.set(key, freshData, ttl);
      }
      return freshData;
    } catch (networkError) {
      console.warn(`[CacheManager] Network/DB fetch failed for "${key}". Falling back to storage:`, networkError);

      // 3. Fallback to any last-known-good cached data (even if expired)
      const lastKnown = memoryCache.get(key)?.data ?? this.getRawLocalStorage<T>(key);
      if (lastKnown !== null && lastKnown !== undefined) {
        return lastKnown;
      }

      // 4. Fallback to provided default fallback or rethrow
      if (options?.fallback !== undefined) {
        return options.fallback;
      }

      throw networkError;
    }
  }

  /**
   * Internal helper to read raw item ignoring expiration in emergencies
   */
  private static getRawLocalStorage<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const envelope: CacheEnvelope<T> = JSON.parse(raw);
      return envelope.data ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Internal helper to prune expired items when storage quota is pressured
   */
  private static pruneExpired(): void {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith('cache_')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              const env = JSON.parse(raw);
              if (now - env.timestamp > env.ttlMs) {
                localStorage.removeItem(k);
              }
            } catch {
              localStorage.removeItem(k);
            }
          }
        }
      }
    } catch {}
  }
}
