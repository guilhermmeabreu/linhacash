// Rate limiter em memória — simples e eficaz para o volume atual
// Para escala maior, substituir por Redis

const requests = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string, limit: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = requests.get(ip);

  if (!record || now > record.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + windowMs });
    return true; // permitido
  }

  if (record.count >= limit) {
    return false; // bloqueado
  }

  record.count++;
  return true; // permitido
}

export function getIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  return ip;
}

// Limpa entradas antigas a cada 5 minutos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    requests.forEach((value, key) => {
      if (now > value.resetAt) requests.delete(key);
    });
  }, 5 * 60 * 1000);
}
