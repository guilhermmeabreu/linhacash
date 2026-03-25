'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface Game {
  id: number;
  game_date: string;
  home_team: string;
  away_team: string;
  home_team_id: number;
  away_team_id: number;
  game_time: string;
  status: string;
}

interface Player {
  id: number;
  api_id: number;
  name: string;
  team: string;
  team_id: number;
  position: string;
}

interface Metrics {
  stat: string;
  avg_l5: number;
  avg_l10: number;
  avg_l20: number;
  avg_home: number;
  avg_away: number;
  avg_minutes_l5: number;
  line: number;
}

// ─── CORES DOS TIMES ─────────────────────────────────────────────────────────
const TEAM_COLORS: Record<string, string> = {
  'Los Angeles Lakers': '#552583',
  'Golden State Warriors': '#1D428A',
  'Boston Celtics': '#007A33',
  'Miami Heat': '#98002E',
  'Phoenix Suns': '#1D1160',
  'Denver Nuggets': '#0E2240',
  'Oklahoma City Thunder': '#007AC1',
  'Dallas Mavericks': '#00538C',
  'New York Knicks': '#F58426',
  'Chicago Bulls': '#CE1141',
  'Milwaukee Bucks': '#00471B',
  'Philadelphia 76ers': '#006BB6',
};

function getTeamColor(team: string) {
  return TEAM_COLORS[team] || '#2a2a2a';
}

function ini(name: string) {
  return name.split(' ').map((c: string) => c[0]).join('').slice(0, 2).toUpperCase();
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [screen, setScreen] = useState<'games' | 'players' | 'detail'>('games');
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [metrics, setMetrics] = useState<Metrics[]>([]);
  const [activeStat, setActiveStat] = useState('points');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const STATS = [
    { key: 'points', label: 'PTS' },
    { key: 'rebounds', label: 'REB' },
    { key: 'assists', label: 'AST' },
    { key: 'three_pointers', label: '3PM' },
  ];

  // ── AUTH ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
  }, []);

  // ── JOGOS ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadGames() {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('game_date', today)
        .order('game_time');
      if (!error && data) setGames(data);
      setLoading(false);
    }
    loadGames();
  }, []);

  // ── JOGADORES ─────────────────────────────────────────────────────────────
  async function openGame(game: Game) {
    setSelectedGame(game);
    setScreen('players');
    const { data } = await supabase
      .from('players')
      .select('*')
      .in('team_id', [game.home_team_id, game.away_team_id]);
    if (data) setPlayers(data);
  }

  // ── DETALHE ───────────────────────────────────────────────────────────────
  async function openPlayer(player: Player) {
    setSelectedPlayer(player);
    setScreen('detail');
    const { data } = await supabase
      .from('player_metrics')
      .select('*')
      .eq('player_id', player.id);
    if (data) setMetrics(data);
  }

  function getMetric(stat: string): Metrics | null {
    return metrics.find(m => m.stat === stat) ?? null;
  }

  const currentMetric = getMetric(activeStat);

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      fontFamily: 'Inter, sans-serif',
      background: '#000',
      color: '#fff',
      minHeight: '100dvh',
      maxWidth: 430,
      margin: '0 auto',
    }}>

      {/* HEADER */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderBottom: '1px solid #2a2a2a',
        background: '#000', position: 'sticky', top: 0, zIndex: 10
      }}>
        {screen !== 'games' && (
          <button onClick={() => setScreen(screen === 'detail' ? 'players' : 'games')}
            style={{ background: '#1a1a1a', border: 'none', color: '#fff', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', fontSize: 16 }}>
            ←
          </button>
        )}
        <div style={{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: 800 }}>
          Linha<span style={{ color: '#00e676' }}>Cash</span>
        </div>
      </div>

      {/* S1: JOGOS */}
      {screen === 'games' && (
        <div style={{ padding: '8px 0' }}>
          <div style={{ padding: '14px 16px 8px', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Hoje · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
          </div>
          {loading && <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>Carregando jogos...</div>}
          {!loading && games.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>Nenhum jogo hoje ainda.<br/>Rode o script fetchNBA.js primeiro.</div>
          )}
          {games.map(g => (
            <div key={g.id} onClick={() => openGame(g)}
              style={{ margin: '0 12px 10px', background: '#111', border: '1px solid #2a2a2a', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ padding: '12px 14px 6px' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#00e676', background: 'rgba(0,230,118,.12)', border: '1px solid rgba(0,230,118,.2)', borderRadius: 6, padding: '3px 9px' }}>
                  {new Date(g.game_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                  <div style={{ width: 54, height: 54, borderRadius: '50%', background: `linear-gradient(135deg,${getTeamColor(g.away_team)}dd,${getTeamColor(g.away_team)}77)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                    {ini(g.away_team)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{g.away_team.split(' ').slice(-1)[0]}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#555' }}>×</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                  <div style={{ width: 54, height: 54, borderRadius: '50%', background: `linear-gradient(135deg,${getTeamColor(g.home_team)}dd,${getTeamColor(g.home_team)}77)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                    {ini(g.home_team)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{g.home_team.split(' ').slice(-1)[0]}</div>
                </div>
              </div>
              <div style={{ padding: '8px 14px', background: '#1a1a1a', borderTop: '1px solid #2a2a2a', fontSize: 11, color: '#888' }}>
                {players.length} jogadores disponíveis
              </div>
            </div>
          ))}
        </div>
      )}

      {/* S2: JOGADORES */}
      {screen === 'players' && selectedGame && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#111', borderBottom: '1px solid #2a2a2a' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{selectedGame.away_team} vs {selectedGame.home_team}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#00e676' }}>
              {new Date(selectedGame.game_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '10px 14px', overflowX: 'auto', borderBottom: '1px solid #2a2a2a' }}>
            {STATS.map(s => (
              <div key={s.key} onClick={() => setActiveStat(s.key)}
                style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #2a2a2a', background: activeStat === s.key ? '#00e676' : '#1a1a1a', color: activeStat === s.key ? '#000' : '#888', flexShrink: 0 }}>
                {s.label}
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px 6px', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Jogadores ({players.length})
          </div>
          {players.map(p => (
            <div key={p.id} onClick={() => openPlayer(p)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: '1px solid #2a2a2a', cursor: 'pointer' }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: `linear-gradient(135deg,${getTeamColor(p.team)}cc,${getTeamColor(p.team)}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {ini(p.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{p.position} · {p.team}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 600 }}>—</div>
                <div style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 5, color: '#888', background: '#1a1a1a' }}>—%</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* S3: DETALHE */}
      {screen === 'detail' && selectedPlayer && (
        <div>
          {/* Tabs de stat */}
          <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #2a2a2a' }}>
            {STATS.map(s => (
              <div key={s.key} onClick={() => setActiveStat(s.key)}
                style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: activeStat === s.key ? '#00e676' : '#888', borderBottom: activeStat === s.key ? '2px solid #00e676' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {s.label}
              </div>
            ))}
          </div>

          {/* Hero */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px', borderBottom: '1px solid #2a2a2a' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: `linear-gradient(135deg,${getTeamColor(selectedPlayer.team)}cc,${getTeamColor(selectedPlayer.team)}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
              {ini(selectedPlayer.name)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{selectedPlayer.name}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{selectedPlayer.position}, {selectedPlayer.team}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7, fontSize: 13, color: '#00e676', fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00e676', display: 'inline-block' }}></span>
                {currentMetric ? `${currentMetric.line} ${STATS.find(s => s.key === activeStat)?.label}` : 'Sem dados'}
              </div>
            </div>
          </div>

          {/* Métricas */}
          {currentMetric ? (
            <>
              <div style={{ display: 'flex', padding: '10px 16px', borderBottom: '1px solid #2a2a2a', background: '#0a0a0a' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em' }}>AVG L5</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{currentMetric.avg_l5}</div>
                </div>
                <div style={{ flex: 1, borderLeft: '1px solid #2a2a2a', paddingLeft: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em' }}>AVG L10</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{currentMetric.avg_l10}</div>
                </div>
                <div style={{ flex: 1, borderLeft: '1px solid #2a2a2a', paddingLeft: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em' }}>AVG L20</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{currentMetric.avg_l20}</div>
                </div>
              </div>

              {/* Splits */}
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Splits</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Casa</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700 }}>{currentMetric.avg_home}</div>
                  </div>
                  <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Fora</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700 }}>{currentMetric.avg_away}</div>
                  </div>
                </div>
                <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 10, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Min/Jogo L5</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700 }}>{currentMetric.avg_minutes_l5}</div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: '#888' }}>
              Sem dados para este jogador ainda.<br/>Aguarde o sync do dia.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
