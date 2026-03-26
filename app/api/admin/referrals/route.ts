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
  const { data } = await supabase.from('referral_codes').select('*').order('uses', { ascending: false });
  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { code, influencer_name } = await req.json();
  await supabase.from('referral_codes').insert({ code, influencer_name, uses: 0, commission_pct: 25, active: true });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, active } = await req.json();
  await supabase.from('referral_codes').update({ active }).eq('id', id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await req.json();
  await supabase.from('referral_codes').delete().eq('id', id);
  return NextResponse.json({ ok: true });
}
