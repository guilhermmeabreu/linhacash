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
  // Buscar de auth.users para pegar usuários Google que não criaram profile ainda
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  
  // Merge: profiles tem prioridade, auth.users preenche os que faltam
  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
  const data = (authUsers?.users || []).map((u: any) => {
    if (profileMap.has(u.id)) return profileMap.get(u.id);
    // Usuário existe no auth mas não tem profile (ex: Google OAuth) — criar profile automaticamente
    supabase.from('profiles').upsert({
      id: u.id,
      name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Usuário',
      email: u.email,
      plan: 'free',
      created_at: u.created_at
    }).then(() => {});
    return {
      id: u.id,
      name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'Usuário',
      email: u.email,
      plan: 'free',
      created_at: u.created_at,
      provider: u.app_metadata?.provider || 'email'
    };
  }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return NextResponse.json(data || []);
}

export async function PATCH(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, plan } = await req.json();
  await supabase.from('profiles').update({ plan }).eq('id', id);
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { email } = await req.json();
  await supabase.auth.admin.generateLink({ type: 'recovery', email });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  await supabase.from('profiles').delete().eq('id', id);
  await supabase.auth.admin.deleteUser(id);
  return NextResponse.json({ ok: true });
}
