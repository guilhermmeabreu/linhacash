#!/usr/bin/env node
/**
 * Defensive resilience script for owner-operated environments only.
 *
 * Example:
 * node scripts/security-resilience.mjs \
 *   --baseUrl http://localhost:3000 \
 *   --token <jwt> \
 *   --freeToken <jwt_free> \
 *   --proToken <jwt_pro> \
 *   --email user@example.com \
 *   --password invalid \
 *   --concurrency 20 --rounds 3
 */

import crypto from 'crypto';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, arg, idx, arr) => {
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = arr[idx + 1];
      acc.push([key, next && !next.startsWith('--') ? next : 'true']);
    }
    return acc;
  }, []),
);

const config = {
  baseUrl: (args.baseUrl || process.env.RESILIENCE_BASE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  token: args.token || process.env.RESILIENCE_AUTH_TOKEN || '',
  freeToken: args.freeToken || process.env.RESILIENCE_FREE_TOKEN || args.token || process.env.RESILIENCE_AUTH_TOKEN || '',
  proToken: args.proToken || process.env.RESILIENCE_PRO_TOKEN || args.token || process.env.RESILIENCE_AUTH_TOKEN || '',
  email: args.email || process.env.RESILIENCE_LOGIN_EMAIL || 'security-test@example.com',
  password: args.password || process.env.RESILIENCE_LOGIN_PASSWORD || 'invalid-password',
  validPassword: args.validPassword || process.env.RESILIENCE_VALID_LOGIN_PASSWORD || '',
  concurrency: Number(args.concurrency || 20),
  rounds: Number(args.rounds || 3),
  timeoutMs: Number(args.timeoutMs || 15000),
  include: String(args.include || 'all').split(',').map((s) => s.trim()).filter(Boolean),
};

function headersFor(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function summarize(results) {
  const statusCounts = new Map();
  const failures = new Map();
  let totalMs = 0;

  for (const r of results) {
    totalMs += r.ms;
    statusCounts.set(String(r.status), (statusCounts.get(String(r.status)) || 0) + 1);
    if (!r.ok) failures.set(r.category, (failures.get(r.category) || 0) + 1);
  }

  return {
    total: results.length,
    avgMs: Math.round(totalMs / Math.max(results.length, 1)),
    status: Object.fromEntries([...statusCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    failures: Object.fromEntries([...failures.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
  };
}

async function timedFetch(name, fn) {
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), config.timeoutMs);
    const res = await fn(controller.signal);
    clearTimeout(timeout);
    const category = res.status === 429 ? 'rate_limited' : res.status >= 500 ? 'server_error' : res.status >= 400 ? 'client_error' : 'ok';
    return { name, ok: res.ok, status: res.status, category, ms: Date.now() - started };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const category = message.includes('timeout') ? 'timeout' : 'network_error';
    return { name, ok: false, status: category, category, ms: Date.now() - started };
  }
}

async function runScenario(scenario) {
  const results = [];
  for (let round = 0; round < config.rounds; round++) {
    const batch = await Promise.all(Array.from({ length: config.concurrency }, () => scenario.exec()));
    results.push(...batch);
  }
  return { name: scenario.name, summary: summarize(results) };
}

function scenarioSelected(id) {
  return config.include.includes('all') || config.include.includes(id);
}

const scenarios = [
  {
    id: 'games-auth-burst',
    name: '1) authenticated burst /api/games',
    exec: () => timedFetch('games-auth', (signal) => fetch(`${config.baseUrl}/api/games`, { headers: headersFor(config.token), signal })),
  },
  {
    id: 'metrics-auth-burst',
    name: '2) authenticated burst /api/metrics',
    exec: () => timedFetch('metrics-auth', (signal) => fetch(`${config.baseUrl}/api/metrics?playerId=1&stat=PTS`, { headers: headersFor(config.token), signal })),
  },
  {
    id: 'checkout-repeat',
    name: '3) repeated checkout initiation attempts',
    exec: () => timedFetch('checkout-repeat', (signal) => fetch(`${config.baseUrl}/api/checkout`, {
      method: 'POST',
      headers: headersFor(config.token),
      body: JSON.stringify({ plan: 'mensal', referralCode: 'SAFELOAD' }),
      signal,
    })),
  },
  {
    id: 'support-repeat',
    name: '4) repeated support/report submissions',
    exec: () => timedFetch('support-repeat', (signal) => fetch(`${config.baseUrl}/api/support`, {
      method: 'POST',
      headers: headersFor(config.token),
      body: JSON.stringify({ subject: 'Resilience test', message: 'Owner-safe support stress validation message.' }),
      signal,
    })),
  },
  {
    id: 'login-repeat',
    name: '5) repeated login attempts (valid/expected)',
    exec: () => timedFetch('login-repeat', (signal) => fetch(`${config.baseUrl}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email: config.email, password: config.validPassword || config.password }),
      signal,
    })),
  },
  {
    id: 'login-invalid-repeat',
    name: '6) repeated invalid login attempts',
    exec: () => timedFetch('login-invalid-repeat', (signal) => fetch(`${config.baseUrl}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email: config.email, password: `${config.password}-invalid` }),
      signal,
    })),
  },
  {
    id: 'protected-post-logout',
    name: '7) protected route after logout/expired token',
    exec: () => timedFetch('protected-post-logout', (signal) => fetch(`${config.baseUrl}/api/games`, {
      headers: headersFor('expired.invalid.token'),
      signal,
    })),
  },
  {
    id: 'webhook-replay-invalid',
    name: '8) webhook replay-like invalid/duplicate signatures',
    exec: () => timedFetch('webhook-replay-invalid', (signal) => {
      const requestId = 'replay-test-fixed-id';
      return fetch(`${config.baseUrl}/api/webhook/mp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': 'ts=1,v1=invalidsig',
          'x-request-id': requestId,
        },
        body: JSON.stringify({ type: 'payment', data: { id: '99999999' }, replayToken: crypto.randomUUID() }),
        signal,
      });
    }),
  },
  {
    id: 'free-concurrency-browse',
    name: '9) high concurrency free-user browsing',
    exec: async () => {
      const games = await timedFetch('free-games', (signal) => fetch(`${config.baseUrl}/api/games`, { headers: headersFor(config.freeToken), signal }));
      const metrics = await timedFetch('free-metrics', (signal) => fetch(`${config.baseUrl}/api/metrics?playerId=1&stat=PTS`, { headers: headersFor(config.freeToken), signal }));
      return games.ok && metrics.ok
        ? { name: 'free-browse', ok: true, status: 200, category: 'ok', ms: games.ms + metrics.ms }
        : { name: 'free-browse', ok: false, status: games.ok ? metrics.status : games.status, category: 'client_error', ms: games.ms + metrics.ms };
    },
  },
  {
    id: 'pro-concurrency-browse',
    name: '10) high concurrency pro-user browsing',
    exec: async () => {
      const games = await timedFetch('pro-games', (signal) => fetch(`${config.baseUrl}/api/games`, { headers: headersFor(config.proToken), signal }));
      const metrics = await timedFetch('pro-metrics', (signal) => fetch(`${config.baseUrl}/api/metrics?playerId=1&stat=REB`, { headers: headersFor(config.proToken), signal }));
      return games.ok && metrics.ok
        ? { name: 'pro-browse', ok: true, status: 200, category: 'ok', ms: games.ms + metrics.ms }
        : { name: 'pro-browse', ok: false, status: games.ok ? metrics.status : games.status, category: 'client_error', ms: games.ms + metrics.ms };
    },
  },
].filter((s) => scenarioSelected(s.id));

async function main() {
  console.log(`\nRunning owner-safe resilience validation against: ${config.baseUrl}`);
  console.log('Use only in local/staging environments owned by LinhaCash.\n');

  if (scenarios.length === 0) {
    console.log('No scenarios selected. Pass --include all or a comma-separated scenario id list.');
    process.exit(1);
  }

  const reports = [];
  for (const scenario of scenarios) {
    const report = await runScenario(scenario);
    reports.push(report);
  }

  console.table(
    reports.map((r) => ({
      scenario: r.name,
      total: r.summary.total,
      avg_ms: r.summary.avgMs,
      status_2xx: r.summary.status['200'] || 0,
      status_401: r.summary.status['401'] || 0,
      status_403: r.summary.status['403'] || 0,
      status_429: r.summary.status['429'] || 0,
      status_5xx: Object.entries(r.summary.status)
        .filter(([k]) => /^5\d\d$/.test(k))
        .reduce((sum, [, v]) => sum + v, 0),
    })),
  );

  for (const report of reports) {
    console.log(`\n[${report.name}] status distribution`);
    console.table(report.summary.status);
    console.log(`[${report.name}] failure categories`);
    console.table(report.summary.failures);
  }
}

main().catch((error) => {
  console.error('Resilience script failed', error);
  process.exit(1);
});
