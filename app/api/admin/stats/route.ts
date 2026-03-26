import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

function checkAuth(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return false;
  try { const email = Buffer.from(token, 'base64').toString('utf-8').split(':')[0]; return email === process.env.ADMIN_EMAIL; } catch { return false; }
}

export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [profiles, games, players] = await Promise.all([
    supabase.from('profiles').select('plan, created_at, name, email').order('created_at', { ascending: false }),
    supabase.from('games').select('id', { count: 'exact' }),
    supabase.from('players').select('id', { count: 'exact' })
  ]);
  const total_users = profiles.data?.length || 0;
  const pro_users = profiles.data?.filter((p: any) => p.plan === 'pro').length || 0;
  return NextResponse.json({ total_users, pro_users, free_users: total_users - pro_users, total_games: games.count || 0, total_players: players.count || 0, recent_signups: profiles.data?.slice(0, 10) || [] });
}
