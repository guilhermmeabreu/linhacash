import {
  upstashAvailable,
  upstashDelete,
  upstashDeleteByPrefix,
  upstashGet,
  upstashSetEx,
} from '@/lib/upstash-rest';

const valueStore = new Map<string, { value: unknown; expiresAt: number }>();
const inflightStore = new Map<string, Promise<unknown>>();
const CACHE_PREFIX = 'cache:';

function now() {
  return Date.now();
}

function cleanupExpiredEntries() {
  const ts = now();
  for (const [key, cached] of valueStore.entries()) {
    if (cached.expiresAt <= ts) {
      valueStore.delete(key);
    }
  }
}

export async function getCachedValue<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const redisKey = `${CACHE_PREFIX}${key}`;
  if (upstashAvailable()) {
    const redisValue = await upstashGet(redisKey);
    if (redisValue) {
      try {
        return JSON.parse(redisValue) as T;
      } catch {
        // ignore malformed cache payload and continue
      }
    }
  }

  const cached = valueStore.get(key);
  if (cached && cached.expiresAt > now()) {
    return cached.value as T;
  }

  const inflight = inflightStore.get(key);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const pending = loader()
    .then((value) => {
      valueStore.set(key, { value, expiresAt: now() + ttlMs });
      if (upstashAvailable()) {
        const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
        void upstashSetEx(redisKey, JSON.stringify(value), ttlSeconds);
      }
      if (valueStore.size > 500) {
        cleanupExpiredEntries();
      }
      return value;
    })
    .finally(() => {
      inflightStore.delete(key);
    });

  inflightStore.set(key, pending as Promise<unknown>);
  return pending;
}

export function invalidateCacheKey(key: string) {
  valueStore.delete(key);
  inflightStore.delete(key);
  if (upstashAvailable()) {
    void upstashDelete(`${CACHE_PREFIX}${key}`);
  }
}

export function invalidateCacheByPrefix(prefix: string) {
  for (const key of valueStore.keys()) {
    if (key.startsWith(prefix)) {
      valueStore.delete(key);
    }
  }
  for (const key of inflightStore.keys()) {
    if (key.startsWith(prefix)) {
      inflightStore.delete(key);
    }
  }
  if (upstashAvailable()) {
    void upstashDeleteByPrefix(`${CACHE_PREFIX}${prefix}`);
  }
}
