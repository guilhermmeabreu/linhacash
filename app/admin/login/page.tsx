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
    ? { bg: '#000000', surface: '#0a0a0a', border: '#1a1a1a', input: '#0f0f0f', text: '#f5f5f5', muted: '#888888', accent: '#22c55e' }
    : { bg: '#f4f6f4', surface: '#ffffff', border: '#d5ddd6', input: '#fbfdfb', text: '#101412', muted: '#5f6a62', accent: '#16a34a' };

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, totpCode: totpCode || undefined }),
      });
      const data = await res.json();
      if (data.ok) {
        window.location.href = '/admin';
        return;
      }
      setError('Não foi possível entrar. Verifique email e senha.');
    } catch {
      setError('Erro de conexão. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: palette.bg, display: 'grid', placeItems: 'center', padding: 'clamp(16px,3vw,28px)', fontFamily: 'Inter, sans-serif' }}>
      <button
        onClick={toggleTheme}
        style={{ position: 'fixed', top: 18, right: 18, width: 38, height: 38, border: `1px solid ${palette.border}`, background: palette.surface, color: palette.muted, cursor: 'pointer', fontSize: 15 }}
        aria-label="Alternar tema"
      >
        {dark ? '☾' : '☀'}
      </button>

      <div style={{ width: '100%', maxWidth: 520, background: palette.surface, border: `1px solid ${palette.border}`, padding: 'clamp(24px,3vw,34px)' }}>
        <p style={{ fontSize: 11, color: palette.accent, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 12, fontWeight: 600 }}>Admin Access · LinhaCash</p>
        <h1 style={{ fontSize: 'clamp(30px,4vw,42px)', fontWeight: 900, marginBottom: 8, color: palette.text, letterSpacing: '-.04em', lineHeight: 1 }}>Painel de operação</h1>
        <p style={{ fontSize: 14, color: palette.muted, marginBottom: 24, lineHeight: 1.65, maxWidth: 460 }}>Acesse um ambiente seguro para gerenciar usuários, assinaturas e sincronização de dados.</p>

        <label style={{ fontSize: 11, color: palette.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="admin@linhacash.com" style={{ width: '100%', margin: '6px 0 12px', padding: 13, minHeight: 46, border: `1px solid ${palette.border}`, background: palette.input, color: palette.text, outline: 'none' }} />

        <label style={{ fontSize: 11, color: palette.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>Senha</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} type="password" placeholder="••••••••" style={{ width: '100%', margin: '6px 0 12px', padding: 13, minHeight: 46, border: `1px solid ${palette.border}`, background: palette.input, color: palette.text, outline: 'none' }} />

        <label style={{ fontSize: 11, color: palette.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>Código 2FA (se habilitado)</label>
        <input
          value={totpCode}
          onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          type="text"
          inputMode="numeric"
          placeholder="000000"
          style={{ width: '100%', margin: '6px 0 14px', padding: 13, minHeight: 46, border: `1px solid ${palette.border}`, background: palette.input, color: palette.text, outline: 'none', fontFamily: 'JetBrains Mono, monospace' }}
        />

        {error && <div style={{ fontSize: 13, marginBottom: 12, border: '1px solid rgba(240,82,82,.5)', background: 'rgba(240,82,82,.1)', color: '#f29b9b', padding: 10 }}>{error}</div>}

        <button disabled={loading} onClick={handleLogin} style={{ width: '100%', minHeight: 48, padding: 12, background: loading ? '#6f8379' : palette.accent, border: 'none', color: '#06200f', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          {loading ? 'Validando acesso...' : 'Entrar no painel'}
        </button>
      </div>
    </div>
  );
}
