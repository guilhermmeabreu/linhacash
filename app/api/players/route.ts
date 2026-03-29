import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateSession, sanitizePlayer, sanitizeMetrics, errorResponse, okResponse, corsHeaders } from '@/lib/security';
import { rateLimit, getIP } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/players?gameId=xxx — jogadores de um jogo
export async function GET(req: Request) {
  const session = await validateSession(req);
  if (!session.valid) return errorResponse('Não autorizado', 401);

  if (!await rateLimit(getIP(req), 60, 60000)) {
    return errorResponse('Muitas requisições', 429);
  }

  const { searchParams } = new URL(req.url);
  const gameId = searchParams.get('gameId');
  if (!gameId) return errorResponse('gameId obrigatório');

  // Buscar o jogo para pegar os team_ids — validar que o jogo existe
  const { data: game } = await supabase
    .from('games')
    .select('id, home_team_id, away_team_id, game_date')
    .eq('id', gameId)
    .single();

  if (!game) return errorResponse('Jogo não encontrado', 404);

  // Buscar jogadores
  const { data: players } = await supabase
    .from('players')
    .select('id, name, team_id, position, jersey, photo')
    .in('team_id', [game.home_team_id, game.away_team_id])
    .order('name');

  let result = (players || []).map(sanitizePlayer);

  // Plano Free: 1 jogador por time
  if (session.plan === 'free') {
    const homeTeamId = game.home_team_id;
    const awayTeamId = game.away_team_id;
    const homePlayer = result.find(p => p.team_id === homeTeamId);
    const awayPlayer = result.find(p => p.team_id === awayTeamId);
    result = [homePlayer, awayPlayer].filter(Boolean) as any[];
  }

  return okResponse({ players: result });
}

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}
