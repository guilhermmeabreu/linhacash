'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface Game { id:number; game_date:string; home_team:string; away_team:string; home_team_id:number; away_team_id:number; game_time:string; status:string; }
interface Player { id:number; api_id:number; name:string; team:string; team_id:number; position:string; }
interface Metric { player_id:number; stat:string; avg_l5:number; avg_l10:number; avg_l20:number; avg_home:number; avg_away:number; avg_minutes_l5:number; line:number; }
interface Profile { id:string; name:string; email:string; plan:string; }

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const CLR:Record<string,string> = {
  'Los Angeles Lakers':'#552583','Golden State Warriors':'#1D428A','Boston Celtics':'#007A33',
  'Miami Heat':'#98002E','Phoenix Suns':'#1D1160','Denver Nuggets':'#0E2240',
  'Oklahoma City Thunder':'#007AC1','Dallas Mavericks':'#00538C','New York Knicks':'#F58426',
  'Chicago Bulls':'#CE1141','Milwaukee Bucks':'#00471B','Philadelphia 76ers':'#006BB6',
  'Atlanta Hawks':'#E03A3E','Brooklyn Nets':'#000','Charlotte Hornets':'#1D1160',
  'Cleveland Cavaliers':'#860038','Detroit Pistons':'#C8102E','Indiana Pacers':'#002D62',
  'Memphis Grizzlies':'#5D76A9','Minnesota Timberwolves':'#0C2340','New Orleans Pelicans':'#002B5C',
  'Orlando Magic':'#0077C0','Sacramento Kings':'#5A2D81','San Antonio Spurs':'#C4CED4',
  'Toronto Raptors':'#CE1141','Utah Jazz':'#002B5C','Washington Wizards':'#002B5C',
  'Houston Rockets':'#CE1141','Los Angeles Clippers':'#C8102E','Portland Trail Blazers':'#E03A3E',
};
const tc = (t:string) => CLR[t]||'#2a2a2a';
const ini = (n:string) => n.split(' ').map((c:string)=>c[0]).join('').slice(0,2).toUpperCase();
const half = (n:number) => Math.round(n*2)/2;

const STATS = [
  {key:'points',label:'PTS',lbl:'Points'},
  {key:'assists',label:'AST',lbl:'Assists'},
  {key:'rebounds',label:'REB',lbl:'Rebounds'},
  {key:'three_pointers',label:'3PM',lbl:'3-Pointers'},
];

// ─── ESTILOS BASE ─────────────────────────────────────────────────────────────
const S = {
  app: { fontFamily:"'Inter',sans-serif", background:'var(--bg)', color:'var(--tx)', minHeight:'100dvh', display:'flex' } as React.CSSProperties,
  // sidebar
  sidebar: { width:240, flexShrink:0, background:'var(--bg)', borderRight:'1px solid var(--bd)', display:'flex', flexDirection:'column' as const, padding:'24px 0', height:'100dvh', position:'sticky' as const, top:0 },
  // main
  main: { flex:1, display:'flex', flexDirection:'column' as const, height:'100dvh', overflow:'hidden' } as React.CSSProperties,
  scrl: { flex:1, overflowY:'auto' as const },
  hdr: { display:'flex', alignItems:'center', gap:10, padding:'12px 16px 10px', background:'var(--bg)', borderBottom:'1px solid var(--bd)', flexShrink:0 } as React.CSSProperties,
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Home() {
  const [screen, setScreen] = useState<'auth'|'games'|'players'|'detail'|'profile'>('auth');
  const [authTab, setAuthTab] = useState<'login'|'register'>('login');
  const [lEmail,setLEmail]=useState(''); const [lPass,setLPass]=useState('');
  const [rName,setRName]=useState(''); const [rEmail,setREmail]=useState(''); const [rPass,setRPass]=useState('');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile|null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selGame, setSelGame] = useState<Game|null>(null);
  const [selPlayer, setSelPlayer] = useState<Player|null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [activeStat, setActiveStat] = useState('points');
  const [curLine, setCurLine] = useState<number|null>(null);
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);
  const [editName,setEditName]=useState(''); const [editEmail,setEditEmail]=useState('');
  const [showEdit,setShowEdit]=useState(false);
  const [showPro,setShowPro]=useState(false);
  const [planType,setPlanType]=useState<'mensal'|'anual'>('anual');
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  // ── AUTH ──────────────────────────────────────────────────────────────────
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{
      if(data.session?.user){ setUser(data.session.user); loadProfile(data.session.user.id); setScreen('games'); }
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,session)=>{
      if(session?.user){ setUser(session.user); loadProfile(session.user.id); setScreen('games'); }
      else { setUser(null); setProfile(null); setScreen('auth'); }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  async function loadProfile(uid:string){
    const {data}=await supabase.from('profiles').select('*').eq('id',uid).single();
    if(data) setProfile(data);
  }

  async function doLogin(){
    if(!lEmail||!lPass) return;
    const {error}=await supabase.auth.signInWithPassword({email:lEmail,password:lPass});
    if(error) alert('Email ou senha incorretos.');
  }

  async function doRegister(){
    if(!rName||!rEmail||!rPass) return;
    if(rPass.length<6){ alert('Senha mínimo 6 caracteres.'); return; }
    const {data,error}=await supabase.auth.signUp({email:rEmail,password:rPass});
    if(error){ alert(error.message); return; }
    if(data.user){
      await supabase.from('profiles').insert({id:data.user.id,name:rName,email:rEmail,plan:'free'});
      alert('Conta criada! Verifique seu email.');
    }
  }

  async function doLogout(){
    await supabase.auth.signOut();
    setScreen('auth');
  }

  // ── JOGOS ─────────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(screen==='games') loadGames();
  },[screen]);

  async function loadGames(){
    setLoading(true);
    const today=new Date().toISOString().split('T')[0];
    const {data}=await supabase.from('games').select('*').eq('game_date',today).order('game_time');
    if(data) setGames(data);
    setLoading(false);
  }

  async function openGame(g:Game){
    setSelGame(g); setActiveStat('points'); setScreen('players');
    const {data}=await supabase.from('players').select('*').in('team_id',[g.home_team_id,g.away_team_id]);
    if(data) setPlayers(data);
  }

  // ── DETALHE ───────────────────────────────────────────────────────────────
  async function openPlayer(p:Player){
    setSelPlayer(p); setActiveStat('points'); setCurLine(null); setScreen('detail');
    const {data}=await supabase.from('player_metrics').select('*').eq('player_id',p.id);
    if(data) setMetrics(data);
  }

  const getMetric = useCallback((stat:string)=>metrics.find(m=>m.stat===stat)||null,[metrics]);
  const curMetric = getMetric(activeStat);
  const defLine = curMetric?half(curMetric.line):0;
  const line = curLine!==null?curLine:defLine;

  // ── TEMA ─────────────────────────────────────────────────────────────────
  function toggleTheme(){
    setDark(d=>{
      const nd=!d;
      const r=document.documentElement.style;
      if(nd){ r.setProperty('--bg','#000');r.setProperty('--s2','#111');r.setProperty('--s3','#1a1a1a');r.setProperty('--bd','#2a2a2a');r.setProperty('--tx','#fff');r.setProperty('--mt','#888'); }
      else { r.setProperty('--bg','#f5f5f7');r.setProperty('--s2','#fff');r.setProperty('--s3','#f0f0f2');r.setProperty('--bd','#e0e0e2');r.setProperty('--tx','#0a0a0a');r.setProperty('--mt','#666'); }
      return nd;
    });
  }

  // ── PERFIL ────────────────────────────────────────────────────────────────
  async function saveProfile(){
    if(!user) return;
    await supabase.from('profiles').update({name:editName,email:editEmail}).eq('id',user.id);
    setProfile(p=>p?{...p,name:editName,email:editEmail}:p);
    setShowEdit(false);
  }

  async function activatePro(){
    if(!user) return;
    await supabase.from('profiles').update({plan:'pro'}).eq('id',user.id);
    setProfile(p=>p?{...p,plan:'pro'}:p);
    setShowPro(false);
  }

  // ── SIDEBAR DESKTOP ───────────────────────────────────────────────────────
  const Sidebar = ()=>(
    <div style={S.sidebar}>
      <div style={{padding:'0 20px 28px',fontSize:20,fontWeight:800}}>Linha<span style={{color:'var(--green)'}}>Cash</span></div>
      <div style={{display:'flex',flexDirection:'column',gap:2,padding:'0 12px',flex:1}}>
        {[{s:'games',icon:'📅',lbl:'Jogos do dia'},{s:'profile',icon:'👤',lbl:'Meu Perfil'}].map(item=>(
          <div key={item.s} onClick={()=>setScreen(item.s as any)}
            style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,fontSize:14,fontWeight:500,color:screen===item.s?'var(--green)':'var(--mt)',background:screen===item.s?'var(--gdim)':'transparent',cursor:'pointer'}}>
            <span>{item.icon}</span>{item.lbl}
          </div>
        ))}
      </div>
      <div style={{padding:12}}>
        <div onClick={()=>setScreen('profile')} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,background:'var(--s2)',border:'1px solid var(--bd)',cursor:'pointer'}}>
          <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,var(--green),#00897b)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:800,color:'#000',flexShrink:0}}>
            {(profile?.name||'U')[0].toUpperCase()}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.name||'Usuário'}</div>
            <div style={{fontSize:11,color:'var(--mt)'}}>{profile?.plan==='pro'?'⚡ Plano Pro':'Plano Gratuito'}</div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── HEADER ────────────────────────────────────────────────────────────────
  const Header = ({back}:{back?:()=>void})=>(
    <div style={S.hdr}>
      {back?<button onClick={back} style={{width:34,height:34,borderRadius:'50%',background:'var(--s3)',border:'none',color:'var(--tx)',cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>←</button>
      :<span style={{width:34,visibility:'hidden'}}>←</span>}
      <div style={{flex:1,textAlign:'center',fontSize:18,fontWeight:800}}>Linha<span style={{color:'var(--green)'}}>Cash</span></div>
      <div style={{display:'flex',gap:6}}>
        <button onClick={()=>setScreen('profile')} style={{width:34,height:34,borderRadius:'50%',background:'var(--s3)',border:'none',color:'var(--mt)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>👤</button>
        <button onClick={toggleTheme} style={{width:34,height:34,borderRadius:'50%',background:'var(--s3)',border:'none',color:'var(--mt)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>{dark?'☀️':'🌙'}</button>
      </div>
    </div>
  );

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={S.app}>
      {/* Sidebar só no desktop e logado */}
      {isDesktop && screen!=='auth' && <Sidebar/>}

      <div style={S.main}>

        {/* ── AUTH ── */}
        {screen==='auth' && (
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
            <div style={{width:'100%',maxWidth:400,background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:20,padding:32}}>
              <div style={{textAlign:'center',marginBottom:32}}>
                <div style={{width:60,height:60,borderRadius:18,background:'linear-gradient(135deg,var(--green),#00897b)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:800,color:'#000',margin:'0 auto 14px'}}>L</div>
                <div style={{fontSize:26,fontWeight:800}}>Linha<span style={{color:'var(--green)'}}>Cash</span></div>
                <div style={{fontSize:13,color:'var(--mt)',marginTop:5}}>Análise de props da NBA</div>
              </div>
              <div style={{display:'flex',background:'var(--s3)',border:'1px solid var(--bd)',borderRadius:12,padding:4,marginBottom:22}}>
                {(['login','register'] as const).map(t=>(
                  <div key={t} onClick={()=>setAuthTab(t)} style={{flex:1,padding:9,textAlign:'center',fontSize:14,fontWeight:600,color:authTab===t?'var(--tx)':'var(--mt)',borderRadius:9,background:authTab===t?'var(--s2)':'transparent',cursor:'pointer'}}>
                    {t==='login'?'Entrar':'Criar conta'}
                  </div>
                ))}
              </div>
              {authTab==='login'?(
                <>
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--mt)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Email</label>
                    <input value={lEmail} onChange={e=>setLEmail(e.target.value)} type="email" placeholder="seu@email.com" style={{width:'100%',background:'var(--s3)',border:'1px solid var(--bd2)',borderRadius:11,padding:'13px 14px',fontSize:15,color:'var(--tx)',fontFamily:'Inter,sans-serif',outline:'none'}}/>
                  </div>
                  <div style={{marginBottom:14}}>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--mt)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Senha</label>
                    <input value={lPass} onChange={e=>setLPass(e.target.value)} type="password" placeholder="••••••••" style={{width:'100%',background:'var(--s3)',border:'1px solid var(--bd2)',borderRadius:11,padding:'13px 14px',fontSize:15,color:'var(--tx)',fontFamily:'Inter,sans-serif',outline:'none'}}/>
                  </div>
                  <button onClick={doLogin} style={{width:'100%',padding:14,background:'var(--green)',border:'none',borderRadius:12,fontSize:16,fontWeight:800,color:'#000',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Entrar</button>
                </>
              ):(
                <>
                  {[{v:rName,sv:setRName,lbl:'Nome',ph:'Seu nome',type:'text'},{v:rEmail,sv:setREmail,lbl:'Email',ph:'seu@email.com',type:'email'},{v:rPass,sv:setRPass,lbl:'Senha',ph:'Mínimo 6 caracteres',type:'password'}].map(f=>(
                    <div key={f.lbl} style={{marginBottom:14}}>
                      <label style={{display:'block',fontSize:11,fontWeight:700,color:'var(--mt)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>{f.lbl}</label>
                      <input value={f.v} onChange={e=>f.sv(e.target.value)} type={f.type} placeholder={f.ph} style={{width:'100%',background:'var(--s3)',border:'1px solid var(--bd2)',borderRadius:11,padding:'13px 14px',fontSize:15,color:'var(--tx)',fontFamily:'Inter,sans-serif',outline:'none'}}/>
                    </div>
                  ))}
                  <button onClick={doRegister} style={{width:'100%',padding:14,background:'var(--green)',border:'none',borderRadius:12,fontSize:16,fontWeight:800,color:'#000',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Criar conta grátis</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── JOGOS ── */}
        {screen==='games' && (
          <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            {!isDesktop && <Header/>}
            <div style={S.scrl}>
              <div style={{padding:'14px 16px 8px',fontSize:11,fontWeight:700,color:'var(--mt)',textTransform:'uppercase',letterSpacing:'0.1em'}}>
                Hoje · {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}).toUpperCase()}
              </div>
              {loading && <div style={{padding:32,textAlign:'center',color:'var(--mt)'}}>Carregando...</div>}
              {!loading && games.length===0 && (
                <div style={{padding:32,textAlign:'center',color:'var(--mt)',lineHeight:1.6}}>
                  Nenhum jogo hoje ainda.<br/>
                  <span style={{fontSize:12}}>O sync automático roda às 11h (horário de Brasília)</span>
                </div>
              )}
              <div style={{display:'grid',gridTemplateColumns:isDesktop?'repeat(auto-fill,minmax(300px,1fr))':'1fr',gap:isDesktop?16:0,padding:isDesktop?'8px 16px':0}}>
                {games.map(g=>(
                  <div key={g.id} onClick={()=>openGame(g)} style={{margin:isDesktop?0:'0 12px 10px',background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:14,overflow:'hidden',cursor:'pointer'}}>
                    <div style={{padding:'12px 14px 6px'}}>
                      <span style={{fontSize:12,fontWeight:700,color:'var(--green)',background:'var(--gdim)',border:'1px solid rgba(0,230,118,.2)',borderRadius:6,padding:'3px 9px'}}>
                        {new Date(g.game_time).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
                      </span>
                    </div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 16px 14px'}}>
                      {[g.away_team,null,g.home_team].map((t,i)=>t===null?(
                        <div key={i} style={{fontSize:14,fontWeight:800,color:'var(--mt2)'}}>×</div>
                      ):(
                        <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,flex:1}}>
                          <div style={{width:54,height:54,borderRadius:'50%',background:`linear-gradient(135deg,${tc(t)}dd,${tc(t)}77)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,border:'2px solid rgba(255,255,255,.08)'}}>
                            {ini(t)}
                          </div>
                          <div style={{fontSize:13,fontWeight:800}}>{t.split(' ').slice(-1)[0]}</div>
                          <div style={{fontSize:10,color:'var(--mt)',textAlign:'center'}}>{t}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:'8px 14px',background:'var(--s3)',borderTop:'1px solid var(--bd)',fontSize:11,color:'var(--mt)'}}>
                      {players.length} jogadores disponíveis
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── JOGADORES ── */}
        {screen==='players' && selGame && (
          <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            {!isDesktop && <Header back={()=>setScreen('games')}/>}
            <div style={S.scrl}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'var(--s2)',borderBottom:'1px solid var(--bd)'}}>
                <span style={{fontSize:13,fontWeight:700}}>{selGame.away_team} × {selGame.home_team}</span>
                <span style={{fontSize:13,fontWeight:600,color:'var(--green)'}}>{new Date(selGame.game_time).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
              </div>
              <div style={{display:'flex',gap:6,padding:'10px 14px',overflowX:'auto',borderBottom:'1px solid var(--bd)'}}>
                {STATS.map(s=>(
                  <div key={s.key} onClick={()=>setActiveStat(s.key)}
                    style={{padding:'5px 12px',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',border:'1px solid var(--bd)',background:activeStat===s.key?'var(--green)':'var(--s3)',color:activeStat===s.key?'#000':'var(--mt)',flexShrink:0}}>
                    {s.label}
                  </div>
                ))}
              </div>
              <div style={{padding:'12px 16px 6px',fontSize:11,fontWeight:700,color:'var(--mt)',textTransform:'uppercase',letterSpacing:'0.08em'}}>
                Jogadores ({players.length})
              </div>
              {players.map(p=>(
                <div key={p.id} onClick={()=>openPlayer(p)}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'11px 16px',borderBottom:'1px solid var(--bd)',cursor:'pointer'}}>
                  <div style={{width:42,height:42,borderRadius:'50%',background:`linear-gradient(135deg,${tc(p.team)}cc,${tc(p.team)}66)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0}}>
                    {ini(p.name)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600}}>{p.name}</div>
                    <div style={{fontSize:11,color:'var(--mt)',marginTop:1}}>{p.position} · {p.team}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0}}>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:600}}>
                      {getMetric(activeStat)?.line||'—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DETALHE ── */}
        {screen==='detail' && selPlayer && (
          <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            {!isDesktop && <Header back={()=>setScreen('players')}/>}
            <div style={{display:'flex',overflowX:'auto',borderBottom:'1px solid var(--bd)',flexShrink:0}}>
              {STATS.map(s=>(
                <div key={s.key} onClick={()=>{setActiveStat(s.key);setCurLine(null);}}
                  style={{padding:'10px 16px',fontSize:13,fontWeight:600,color:activeStat===s.key?'var(--green)':'var(--mt)',borderBottom:activeStat===s.key?'2px solid var(--green)':'2px solid transparent',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
                  {s.label}
                </div>
              ))}
            </div>
            <div style={S.scrl}>
              {/* Hero */}
              <div style={{display:'flex',alignItems:'flex-start',gap:14,padding:'14px 16px',borderBottom:'1px solid var(--bd)'}}>
                <div style={{width:60,height:60,borderRadius:'50%',background:`linear-gradient(135deg,${tc(selPlayer.team)}cc,${tc(selPlayer.team)}55)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,flexShrink:0}}>
                  {ini(selPlayer.name)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:18,fontWeight:800}}>{selPlayer.name}</div>
                  <div style={{fontSize:12,color:'var(--mt)',marginTop:2}}>{selPlayer.position}, {selPlayer.team}</div>
                  <div style={{display:'flex',alignItems:'center',gap:5,marginTop:7,fontSize:13,color:'var(--green)',fontWeight:600}}>
                    <span style={{width:6,height:6,borderRadius:'50%',background:'var(--green)',display:'inline-block'}}></span>
                    {line} {STATS.find(s=>s.key===activeStat)?.lbl}
                  </div>
                </div>
              </div>

              {/* Info strip */}
              <div style={{display:'flex',padding:'10px 16px',borderBottom:'1px solid var(--bd)',background:'var(--s1)'}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,fontWeight:600,color:'var(--mt2)',textTransform:'uppercase',letterSpacing:'0.07em'}}>OPP</div>
                  <div style={{fontSize:13,fontWeight:700,marginTop:2}}>vs {selGame?( selGame.home_team===selPlayer.team?selGame.away_team:selGame.home_team):'—'}</div>
                </div>
                <div style={{flex:1,borderLeft:'1px solid var(--bd)',paddingLeft:14}}>
                  <div style={{fontSize:10,fontWeight:600,color:'var(--mt2)',textTransform:'uppercase',letterSpacing:'0.07em'}}>HORÁRIO</div>
                  <div style={{fontSize:13,fontWeight:700,marginTop:2}}>{selGame?new Date(selGame.game_time).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—'}</div>
                </div>
                <div style={{flex:1,borderLeft:'1px solid var(--bd)',paddingLeft:14}}>
                  <div style={{fontSize:10,fontWeight:600,color:'var(--mt2)',textTransform:'uppercase',letterSpacing:'0.07em'}}>AVG L10</div>
                  <div style={{fontSize:13,fontWeight:700,marginTop:2}}>{curMetric?.avg_l10||'—'}</div>
                </div>
              </div>

              {/* Linha editor */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid var(--bd)'}}>
                <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'var(--s3)',border:'1px solid var(--bd)',borderRadius:8,padding:'6px 12px',fontSize:12,fontWeight:600}}>
                  AVG: <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:'var(--green)'}}>{curMetric?.avg_l10||'—'}</span>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:11,color:'var(--mt)',fontWeight:600,textTransform:'uppercase'}}>Linha</span>
                  <div style={{display:'flex',alignItems:'center',gap:4,background:'var(--s3)',border:'1px solid var(--bd2)',borderRadius:8,padding:'4px 8px'}}>
                    <button onClick={()=>setCurLine(half(line-0.5))} style={{background:'none',border:'none',color:'var(--mt)',fontSize:18,cursor:'pointer',padding:'0 3px',lineHeight:1}}>−</button>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,color:'var(--green)',minWidth:38,textAlign:'center'}}>{line}</span>
                    <button onClick={()=>setCurLine(half(line+0.5))} style={{background:'none',border:'none',color:'var(--mt)',fontSize:18,cursor:'pointer',padding:'0 3px',lineHeight:1}}>+</button>
                  </div>
                </div>
              </div>

              {/* Splits */}
              {curMetric?(
                <div style={{padding:'12px 16px 20px'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--mt)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Splits</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                    <div style={{background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:12,padding:12}}>
                      <div style={{fontSize:10,color:'var(--mt)',fontWeight:600,textTransform:'uppercase',marginBottom:4}}>Casa</div>
                      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:700}}>{curMetric.avg_home}</div>
                      <div style={{fontSize:10,color:'var(--mt)',marginTop:2}}>média</div>
                    </div>
                    <div style={{background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:12,padding:12}}>
                      <div style={{fontSize:10,color:'var(--mt)',fontWeight:600,textTransform:'uppercase',marginBottom:4}}>Fora</div>
                      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:700}}>{curMetric.avg_away}</div>
                      <div style={{fontSize:10,color:'var(--mt)',marginTop:2}}>média</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div style={{background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:12,padding:12}}>
                      <div style={{fontSize:10,color:'var(--mt)',fontWeight:600,textTransform:'uppercase',marginBottom:4}}>L5</div>
                      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:700}}>{curMetric.avg_l5}</div>
                    </div>
                    <div style={{background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:12,padding:12}}>
                      <div style={{fontSize:10,color:'var(--mt)',fontWeight:600,textTransform:'uppercase',marginBottom:4}}>Min/Jogo L5</div>
                      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:700}}>{curMetric.avg_minutes_l5}</div>
                    </div>
                  </div>
                </div>
              ):(
                <div style={{padding:32,textAlign:'center',color:'var(--mt)'}}>Sem dados ainda. Aguarde o sync.</div>
              )}
            </div>
          </div>
        )}

        {/* ── PERFIL ── */}
        {screen==='profile' && (
          <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            {!isDesktop && <Header back={()=>setScreen('games')}/>}
            <div style={S.scrl}>
              <div style={{padding:'28px 16px 20px',display:'flex',flexDirection:'column',alignItems:'center',gap:12,borderBottom:'1px solid var(--bd)'}}>
                <div style={{width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,var(--green),#00897b)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:800,color:'#000'}}>
                  {(profile?.name||'U')[0].toUpperCase()}
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:18,fontWeight:800}}>{profile?.name||'Usuário'}</div>
                  <div style={{fontSize:13,color:'var(--mt)',marginTop:1}}>{profile?.email||user?.email}</div>
                </div>
                <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'var(--gdim)',border:'1px solid rgba(0,230,118,.25)',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:700,color:'var(--green)'}}>
                  {profile?.plan==='pro'?'⚡ Plano Pro':'✦ Plano Gratuito'}
                </div>
              </div>

              {/* Planos */}
              <div style={{padding:'20px 16px 0'}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--mt)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Planos</div>
                <div style={{background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:14,overflow:'hidden'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',borderBottom:'1px solid var(--bd)',opacity:profile?.plan==='pro'?0.5:1}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:700}}>Gratuito</div>
                      <div style={{fontSize:12,color:'var(--mt)',marginTop:2}}>1 jogo · 1 jogador/time · PTS e REB</div>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:profile?.plan!=='pro'?'var(--green)':'var(--mt)'}}>{profile?.plan!=='pro'?'Ativo':'—'}</div>
                  </div>
                  <div onClick={()=>profile?.plan!=='pro'&&setShowPro(true)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 16px',cursor:profile?.plan!=='pro'?'pointer':'default'}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:700,color:profile?.plan==='pro'?'var(--green)':'var(--tx)'}}>Pro {profile?.plan==='pro'?<span style={{fontSize:9,background:'var(--green)',color:'#000',borderRadius:4,padding:'2px 5px',fontWeight:800,verticalAlign:'middle',marginLeft:5}}>ATIVO</span>:<span style={{fontSize:9,background:'var(--s4)',color:'var(--mt)',borderRadius:4,padding:'2px 5px',fontWeight:700,verticalAlign:'middle',marginLeft:5}}>R$24,90/mês</span>}</div>
                      <div style={{fontSize:12,color:'var(--mt)',marginTop:2}}>Todos os jogos · Todos jogadores · Todas as stats</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conta */}
              <div style={{padding:'20px 16px 0'}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--mt)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Conta</div>
                <div style={{background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:14,overflow:'hidden'}}>
                  {[
                    {lbl:'Editar perfil',fn:()=>{setEditName(profile?.name||'');setEditEmail(profile?.email||user?.email||'');setShowEdit(true);}},
                    {lbl:'Segurança',fn:()=>{}},
                    {lbl:`Tema (${dark?'Escuro':'Claro'})`,fn:toggleTheme},
                  ].map((item,i)=>(
                    <div key={i} onClick={item.fn} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:'1px solid var(--bd)',cursor:'pointer'}}>
                      <span style={{flex:1,fontSize:14,fontWeight:500}}>{item.lbl}</span>
                      <span style={{color:'var(--mt2)'}}>›</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suporte */}
              <div style={{padding:'20px 16px 0'}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--mt)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>Suporte</div>
                <div style={{background:'var(--s2)',border:'1px solid var(--bd)',borderRadius:14,overflow:'hidden'}}>
                  {['Perguntas frequentes','Falar com suporte','Reportar problema','Termos de uso'].map((lbl,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderBottom:i<3?'1px solid var(--bd)':'none',cursor:'pointer'}}>
                      <span style={{flex:1,fontSize:14,fontWeight:500}}>{lbl}</span>
                      <span style={{color:'var(--mt2)'}}>›</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{margin:'24px 16px 36px',textAlign:'center'}}>
                <button onClick={doLogout} style={{background:'none',border:'1px solid var(--bd)',borderRadius:10,padding:'10px 32px',color:'var(--red)',fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Sair da conta</button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL EDITAR PERFIL ── */}
        {showEdit && (
          <div onClick={()=>setShowEdit(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',backdropFilter:'blur(10px)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
            <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:480,background:'var(--s2)',borderRadius:'20px 20px 0 0',padding:'0 20px 36px'}}>
              <div style={{width:36,height:4,background:'var(--bd2)',borderRadius:999,margin:'10px auto 16px'}}></div>
              <div style={{fontSize:17,fontWeight:700,marginBottom:16}}>Editar Perfil</div>
              {[{v:editName,sv:setEditName,lbl:'Nome',type:'text'},{v:editEmail,sv:setEditEmail,lbl:'Email',type:'email'}].map(f=>(
                <div key={f.lbl} style={{marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--mt)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:5}}>{f.lbl}</div>
                  <input value={f.v} onChange={e=>f.sv(e.target.value)} type={f.type} style={{width:'100%',background:'var(--s3)',border:'1px solid var(--bd2)',borderRadius:10,padding:'10px 12px',fontSize:14,color:'var(--tx)',fontFamily:'Inter,sans-serif',outline:'none'}}/>
                </div>
              ))}
              <button onClick={saveProfile} style={{width:'100%',padding:13,background:'var(--green)',border:'none',borderRadius:12,fontSize:15,fontWeight:700,color:'#000',cursor:'pointer',fontFamily:'Inter,sans-serif',marginBottom:6,marginTop:8}}>Salvar</button>
              <button onClick={()=>setShowEdit(false)} style={{width:'100%',padding:11,background:'none',border:'none',fontSize:14,color:'var(--mt)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Cancelar</button>
            </div>
          </div>
        )}

        {/* ── MODAL PRO ── */}
        {showPro && (
          <div onClick={()=>setShowPro(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',backdropFilter:'blur(10px)',zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
            <div onClick={e=>e.stopPropagation()} style={{width:'100%',maxWidth:480,background:'var(--s2)',borderRadius:'20px 20px 0 0',padding:'0 20px 36px',maxHeight:'92dvh',overflowY:'auto'}}>
              <div style={{width:36,height:4,background:'var(--bd2)',borderRadius:999,margin:'10px auto 0'}}></div>
              <div style={{textAlign:'center',padding:'18px 0 14px'}}>
                <div style={{fontSize:30,marginBottom:8}}>⚡</div>
                <div style={{fontSize:20,fontWeight:800}}>Assine o Plano Pro</div>
                <div style={{fontSize:13,color:'var(--mt)',marginTop:4}}>Acesso completo à plataforma</div>
              </div>
              <div style={{background:'var(--s3)',border:'1px solid var(--bd)',borderRadius:12,padding:12,marginBottom:14,display:'flex',flexDirection:'column',gap:8}}>
                {['Todos os jogos do dia','Todos os jogadores','AST, 3PM, P+A, P+R','Splits Casa/Fora','Sem limites'].map(b=>(
                  <div key={b} style={{display:'flex',alignItems:'center',gap:10,fontSize:13}}><span style={{color:'var(--green)',fontWeight:700}}>✓</span>{b}</div>
                ))}
              </div>
              <div style={{display:'flex',gap:8,marginBottom:14}}>
                {(['mensal','anual'] as const).map(p=>(
                  <div key={p} onClick={()=>setPlanType(p)} style={{flex:1,border:`2px solid ${planType===p?'var(--green)':'var(--bd)'}`,borderRadius:12,padding:12,cursor:'pointer',textAlign:'center',background:planType===p?'var(--gdim)':'transparent',position:'relative'}}>
                    {p==='anual'&&<div style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',background:'var(--green)',color:'#000',fontSize:10,fontWeight:800,padding:'2px 10px',borderRadius:999,whiteSpace:'nowrap'}}>MAIS POPULAR</div>}
                    <div style={{fontSize:11,fontWeight:700,color:planType===p?'var(--green)':'var(--mt)',textTransform:'uppercase',marginBottom:4}}>{p}</div>
                    <div style={{fontSize:22,fontWeight:800,color:planType===p?'var(--green)':'var(--tx)'}}>{p==='mensal'?'R$24,90':'R$197,00'}</div>
                    {p==='anual'&&<div style={{fontSize:11,color:'var(--mt)',marginTop:2}}>R$16,41/mês · 34% off</div>}
                  </div>
                ))}
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--mt)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Código de indicação (opcional)</div>
                <input type="text" style={{width:'100%',background:'var(--s3)',border:'1px solid var(--bd2)',borderRadius:10,padding:'10px 12px',fontSize:14,color:'var(--tx)',fontFamily:'Inter,sans-serif',outline:'none',textTransform:'uppercase'}}/>
              </div>
              <div style={{background:'var(--s3)',border:'1px solid var(--bd)',borderRadius:10,padding:12,marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:13,color:'var(--mt)'}}>Total</span>
                <span style={{fontSize:18,fontWeight:800,fontFamily:'JetBrains Mono,monospace',color:'var(--green)'}}>{planType==='mensal'?'R$24,90':'R$197,00'}</span>
              </div>
              <button onClick={activatePro} style={{width:'100%',padding:14,background:'var(--green)',border:'none',borderRadius:12,fontSize:16,fontWeight:800,color:'#000',cursor:'pointer',fontFamily:'Inter,sans-serif',marginBottom:8}}>
                Assinar Plano {planType==='mensal'?'Mensal':'Anual'}
              </button>
              <button onClick={()=>setShowPro(false)} style={{width:'100%',padding:11,background:'none',border:'none',fontSize:14,color:'var(--mt)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Agora não</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
