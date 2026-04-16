'use client';

import { useState, useEffect } from 'react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dark, setDark] = useState(true);

  const palette = dark
    ? { bg: '#060a08', card: '#0f1613', border: '#26332d', input: '#141d19', text: '#e8f3ed', muted: '#8aa195' }
    : { bg: '#edf4f0', card: '#ffffff', border: '#cfddd6', input: '#f8fbfa', text: '#12201a', muted: '#5a7167' };

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('admin_theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    if (localStorage.getItem('admin_theme') === 'light') setDark(false);
  }, []);

  async function handleLogin() {
    setError('');
    if (!email || !password) {
      setError('Preencha todos os campos para continuar.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, totpCode: totpCode || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        window.location.href = '/admin';
        return;
      }
      setError('Não foi possível entrar. Verifique e-mail, senha e código 2FA.');
    } catch {
      setError('Erro de conexão. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login" style={{ ['--bg' as string]: palette.bg, ['--card' as string]: palette.card, ['--border' as string]: palette.border, ['--input' as string]: palette.input, ['--text' as string]: palette.text, ['--muted' as string]: palette.muted }}>
      <style>{`
        .admin-login{min-height:100vh;background:radial-gradient(circle at top right,rgba(0,230,118,.12),transparent 45%), var(--bg);display:grid;place-items:center;padding:20px;font-family:Inter,sans-serif;color:var(--text)}
        .admin-login-shell{width:100%;max-width:520px;display:grid;gap:14px}
        .admin-login-theme{justify-self:end;width:42px;height:42px;border-radius:999px;border:1px solid var(--border);background:var(--card);color:var(--muted);cursor:pointer}
        .admin-login-card{background:var(--card);border:1px solid var(--border);padding:clamp(22px,3vw,34px);border-radius:18px;box-shadow:0 28px 56px rgba(0,0,0,.3)}
        .admin-login-eyebrow{font-size:11px;color:#00c768;text-transform:uppercase;letter-spacing:.12em;font-weight:700;margin-bottom:12px}
        .admin-login-title{font-size:clamp(30px,4vw,38px);line-height:1.04;letter-spacing:-.03em;margin:0 0 8px}
        .admin-login-copy{font-size:14px;line-height:1.6;color:var(--muted);margin:0 0 18px}
        .admin-login-grid{display:grid;gap:10px}
        .admin-login-label{font-size:12px;color:var(--muted);font-weight:700}
        .admin-login-input{width:100%;min-height:48px;padding:12px 13px;border:1px solid var(--border);background:var(--input);color:var(--text);border-radius:10px;outline:none}
        .admin-login-input:focus{border-color:#00c768;box-shadow:0 0 0 3px rgba(0,230,118,.14)}
        .admin-login-error{font-size:13px;border:1px solid rgba(240,82,82,.45);background:rgba(240,82,82,.12);color:#f5aaaa;padding:10px 12px;border-radius:10px}
        .admin-login-btn{width:100%;min-height:50px;border:none;border-radius:10px;font-weight:800;background:#00e676;color:#06200f;cursor:pointer;transition:.15s ease}
        .admin-login-btn[disabled]{background:#6f8379;cursor:not-allowed;opacity:.85}
      `}</style>

      <div className="admin-login-shell">
        <button onClick={toggleTheme} className="admin-login-theme" aria-label="Alternar tema">
          {dark ? '☾' : '☀'}
        </button>

        <div className="admin-login-card">
          <p className="admin-login-eyebrow">Admin Access · LinhaCash</p>
          <h1 className="admin-login-title">Painel de operação</h1>
          <p className="admin-login-copy">Gerencie usuários, cobrança, indicações e sincronização com visão operacional em tempo real.</p>

          <div className="admin-login-grid">
            <label className="admin-login-label">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="admin@linhacash.com" className="admin-login-input" />

            <label className="admin-login-label">Senha</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} type="password" placeholder="••••••••" className="admin-login-input" />

            <label className="admin-login-label">Código 2FA (se habilitado)</label>
            <input
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              type="text"
              inputMode="numeric"
              placeholder="000000"
              className="admin-login-input"
            />

            {error && <div className="admin-login-error">{error}</div>}

            <button disabled={loading} onClick={handleLogin} className="admin-login-btn">
              {loading ? 'Validando acesso...' : 'Entrar no painel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
