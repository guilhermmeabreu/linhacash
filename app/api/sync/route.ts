import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import https from 'https';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const API_KEY = process.env.NBA_API_KEY!;
const BASE_URL = 'v2.nba.api-sports.io';
const SEASON = 2025;

function apiGet(path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path,
      headers: { 'x-apisports-key': API_KEY }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function fetchGames() {
  const today = new Date().toISOString().split('T')[0];
  const data = await apiGet(`/games?date=${today}&league=12&season=${SEASON}`);
  if (!data.response || data.response.length === 0) return [];
  const games = data.response.map((g: any) => ({
    game_date: today,
    home_team: g.teams.home.name,
    away_team: g.teams.visitors.name,
    home_team_id: g.teams.home.id,
    away_team_id: g.teams.visitors.id,
    game_time: g.date.start,
    status: g.status.long
  }));
  await supabase.from('games').upsert(games);
  return data.response;
}

async function fetchPlayers(teamId: number) {
  const data = await apiGet(`/players?team=${teamId}&season=${SEASON}`);
  if (!data.response) return [];
  const players = data.response.map((p: any) => ({
    api_id: p.id,
    name: `${p.firstname} ${p.lastname}`,
    team: p.teams?.[0]?.name || '',
    team_id: teamId,
    position: p.leagues?.standard?.pos || ''
  }));
  await supabase.from('players').upsert(players, { onConflict: 'api_id' });
  return players;
}

async function fetchPlayerStats(playerId: number, apiPlayerId: number) {
  const data = await apiGet(`/players/statistics?id=${apiPlayerId}&season=${SEASON}`);
  if (!data.response || data.response.length === 0) return;
  const stats = data.response.slice(0, 20).map((s: any) => ({
    player_id: playerId,
    game_date: s.game?.date || null,
    opponent: s.team?.name || '',
    is_home: true,
    points: s.points || 0,
    rebounds: s.totReb || 0,
    assists: s.assists || 0,
    three_pointers: s.tpm || 0,
    minutes: parseInt(s.min) || 0
  }));
  await supabase.from('player_stats').upsert(stats);
}

async function calcMetrics(playerId: number) {
  const { data: stats } = await supabase
    .from('player_stats')
    .select('*')
    .eq('player_id', playerId)
    .order('game_date', { ascending: false })
    .limit(20);
  if (!stats || stats.length === 0) return;
  const calc = (arr: number[]) => arr.length ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0;
  for (const stat of ['points', 'rebounds', 'assists', 'three_pointers']) {
    const all = stats.map((s: any) => s[stat]);
    const home = stats.filter((s: any) => s.is_home).map((s: any) => s[stat]);
    const away = stats.filter((s: any) => !s.is_home).map((s: any) => s[stat]);
    await supabase.from('player_metrics').upsert({
      player_id: playerId,
      stat,
      avg_l5: calc(all.slice(0, 5)),
      avg_l10: calc(all.slice(0, 10)),
      avg_l20: calc(all),
      avg_home: calc(home),
      avg_away: calc(away),
      avg_minutes_l5: calc(stats.slice(0, 5).map((s: any) => s.minutes)),
      line: calc(all.slice(0, 10)),
      updated_at: new Date().toISOString()
    }, { onConflict: 'player_id,stat' });
  }
}

export async function GET() {
  try {
    const games = await fetchGames();
    if (games.length === 0) return NextResponse.json({ message: 'Nenhum jogo hoje' });
    const teamIds = new Set<number>();
    games.forEach((g: any) => {
      teamIds.add(g.teams.home.id);
      teamIds.add(g.teams.visitors.id);
    });
    for (const teamId of teamIds) {
      const players = await fetchPlayers(teamId);
      for (const player of players) {
        const { data } = await supabase.from('players').select('id').eq('api_id', player.api_id).single();
        if (data) {
          await fetchPlayerStats(data.id, player.api_id);
          await calcMetrics(data.id);
        }
      }
    }
    return NextResponse.json({ message: 'Sync completo!', games: games.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
