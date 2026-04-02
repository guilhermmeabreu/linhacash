// Rate limiter com suporte a Upstash Redis (produção) e memória (desenvolvimento)
// Para ativar Redis: adicionar UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN na Vercel

const memoryStore = new Map<string, { count: number; resetAt: number }>();

export type RateLimitResult = {
  allowed: boolean;
  count: number;
  limit: number;
  resetAt: number;
  retryAfterSeconds: number;
};

// Rate limiter em memória (fallback se Redis não configurado)
function rateLimitMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const record = memoryStore.get(key);
  if (!record || now > record.resetAt) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { allowed: true, count: 1, limit, resetAt, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  if (record.count >= limit) {
    return {
      allowed: false,
      count: record.count,
      limit,
      resetAt: record.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
    };
  }
  record.count++;
  return {
    allowed: true,
    count: record.count,
    limit,
    resetAt: record.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
  };
}

// Rate limiter com Upstash Redis (persistente entre deploys)
async function rateLimitRedis(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return rateLimitMemory(key, limit, windowMs);

  try {
    const now = Date.now();
    const windowSec = Math.ceil(windowMs / 1000);
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['PTTL', key],
        ['EXPIRE', key, windowSec, 'NX'],
        ['PTTL', key],
      ])
    });
    const data = await res.json();
    const count = data[0]?.result || 1;
    const preTtl = Number(data[1]?.result || -1);
    const postTtl = Number(data[3]?.result || -1);
    const ttlMs = postTtl > 0 ? postTtl : preTtl > 0 ? preTtl : windowMs;
    const resetAt = now + ttlMs;
    return {
      allowed: count <= limit,
      count,
      limit,
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
    };
  } catch {
    // Se Redis falhar, usa memória como fallback
    return rateLimitMemory(key, limit, windowMs);
  }
}

export async function rateLimit(ip: string, limit: number = 30, windowMs: number = 60000): Promise<boolean> {
  const key = `rl:${ip}:${windowMs}`;
  const result = await rateLimitRedis(key, limit, windowMs);
  return result.allowed;
}

export async function rateLimitDetailed(key: string, limit: number = 30, windowMs: number = 60000): Promise<RateLimitResult> {
  return rateLimitRedis(`rl:${key}:${windowMs}`, limit, windowMs);
}

export function deploymentNamespace(): string {
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || 'local';
  return `${environment}:${deploymentId}`;
}

// Versão síncrona para compatibilidade (usa só memória)
export function rateLimitSync(ip: string, limit: number = 30, windowMs: number = 60000): boolean {
  return rateLimitMemory(`${ip}:${windowMs}`, limit, windowMs).allowed;
}

export function getIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const vercelForwardedFor = req.headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) return vercelForwardedFor.split(',')[0].trim();

  return 'unknown';
}

// Limpa entradas antigas a cada 10 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    memoryStore.forEach((value, key) => {
      if (now > value.resetAt) memoryStore.delete(key);
    });
  }, 10 * 60 * 1000);
}
