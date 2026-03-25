require('dotenv').config({ path: '.env.local' });

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const API_KEY = process.env.NBA_API_KEY;
const BASE_URL = 'v2.nba.api-sports.io';
const SEASON = 2025; // jogos
const SEASON_STATS = 2024; // stats e jogadores (limite do plano gratuito)

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path,
      headers: { 'x-apisports-key': API_KEY }
    };
    https.get(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function fetchGames() {
  const today = process.env.NBA_DATE || new Date().toISOString().split('T')[0];
  console.log('Buscando jogos do dia:', today);
  const data = await apiGet(`/games?date=${today}`);
  console.log('Resposta da API:', JSON.stringify(data).slice(0, 300));
  if (!data.response || data.response.length === 0) {
    console.log('Nenhum jogo hoje.');
    return [];
  }
  const games = data.response.map(g => ({
    game_date: today,
    home_team: g.teams.home.name,
    away_team: g.teams.visitors.name,
    home_team_id: g.teams.home.id,
    away_team_id: g.teams.visitors.id,
    game_time: g.date.start,
    status: g.status.long
  }));
  const { error } = await supabase.from('games').upsert(games);
  if (error) console.error('Erro ao salvar jogos:', error);
  else console.log(`${games.length} jogos salvos!`);
  return data.response;
}

async function fetchPlayers(teamId) {
  const data = await apiGet(`/players?team=${teamId}&season=${SEASON_STATS}`);
  console.log(`Time ${teamId} - total:`, data.results);
  if (!data.response) return [];
  const players = data.response.map(p => ({
    api_id: p.id,
    name: `${p.firstname} ${p.lastname}`,
    team: p.teams?.[0]?.name || '',
    team_id: teamId,
    position: p.leagues?.standard?.pos || ''
  }));
  const { error } = await supabase.from('players').upsert(players, { onConflict: 'api_id' });
  if (error) console.error('Erro ao salvar jogadores:', error);
  else console.log(`${players.length} jogadores do time ${teamId} salvos!`);
  return players;
}

async function fetchPlayerStats(playerId, apiPlayerId) {
  const data = await apiGet(`/players/statistics?id=${apiPlayerId}&season=${SEASON_STATS}`);
  if (!data.response || data.response.length === 0) return;
  const stats = data.response.slice(0, 20).map(s => ({
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
  const { error } = await supabase.from('player_stats').upsert(stats);
  if (error) console.error('Erro ao salvar stats:', error);
  else console.log(`Stats do jogador ${apiPlayerId} salvas!`);
}

async function calcMetrics(playerId) {
  const { data: stats } = await supabase
    .from('player_stats')
    .select('*')
    .eq('player_id', playerId)
    .order('game_date', { ascending: false })
    .limit(20);
  if (!stats || stats.length === 0) return;
  const calc = (arr) => arr.length ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0;
  for (const stat of ['points', 'rebounds', 'assists', 'three_pointers']) {
    const all = stats.map(s => s[stat]);
    const home = stats.filter(s => s.is_home).map(s => s[stat]);
    const away = stats.filter(s => !s.is_home).map(s => s[stat]);
    await supabase.from('player_metrics').upsert({
      player_id: playerId,
      stat,
      avg_l5: calc(all.slice(0, 5)),
      avg_l10: calc(all.slice(0, 10)),
      avg_l20: calc(all),
      avg_home: calc(home),
      avg_away: calc(away),
      avg_minutes_l5: calc(stats.slice(0, 5).map(s => s.minutes)),
      line: calc(all.slice(0, 10)),
      updated_at: new Date().toISOString()
    }, { onConflict: 'player_id,stat' });
  }
  console.log(`Metricas calculadas para jogador ${playerId}`);
}

async function main() {
  console.log('=== LinhaCash NBA Sync ===');
  const games = await fetchGames();
  if (games.length === 0) return;
  const teamIds = new Set();
  games.forEach(g => {
    teamIds.add(g.teams.home.id);
    teamIds.add(g.teams.visitors.id);
  });
  for (const teamId of teamIds) {
    const players = await fetchPlayers(teamId);
    for (const player of players) {
      const { data } = await supabase
        .from('players')
        .select('id')
        .eq('api_id', player.api_id)
        .single();
      if (data) {
        await fetchPlayerStats(data.id, player.api_id);
        await calcMetrics(data.id);
      }
    }
  }
  console.log('=== Sync completo! ===');
}

main().catch(console.error);
