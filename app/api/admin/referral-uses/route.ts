import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

function checkAuth(req: Request) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/admin_auth=([^;]+)/);
  return match?.[1] === process.env.ADMIN_EMAIL;
}

export async function GET(req: Request) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data } = await supabase.from('referral_uses').select('*, profiles(name, email)').order('created_at', { ascending: false });
  return NextResponse.json(data || []);
}
