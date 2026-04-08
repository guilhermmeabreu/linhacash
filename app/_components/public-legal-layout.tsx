import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';

export function PublicLegalLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <main style={{ minHeight: '100vh', background: '#000000', color: '#f5f5f5', fontFamily: 'Inter, -apple-system, Segoe UI, sans-serif' }}>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 20px 54px' }}>
        <header
          style={{
            borderBottom: '1px solid #1a1a1a',
            paddingBottom: 16,
            marginBottom: 26,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
            background: 'color-mix(in srgb, #000 88%, transparent)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Link href="/landing.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#f5f5f5', fontWeight: 900, letterSpacing: '-.03em' }}>
            <Image src="/logo.png" alt="LinhaCash" width={24} height={24} />
            <span>
              Linha<span style={{ color: '#22c55e' }}>Cash</span>
            </span>
          </Link>
          <div style={{ color: '#888888', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>Última atualização: {updatedAt}</div>
        </header>

        <section style={{ maxWidth: 760, margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(30px,4vw,42px)', fontWeight: 900, letterSpacing: '-.04em', marginBottom: 18, lineHeight: 1.05 }}>{title}</h1>
          <div style={{ lineHeight: 1.75, fontSize: 15, color: '#c7c7c7' }}>{children}</div>
        </section>
      </div>

      <footer style={{ borderTop: '1px solid #1a1a1a', padding: '22px 20px 30px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: 8, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#888888' }}>
            <Link href="/termos" style={linkStyle}>
              Termos de uso
            </Link>{' '}
            ·{' '}
            <Link href="/privacidade" style={linkStyle}>
              Política de privacidade
            </Link>
          </p>
          <p style={{ fontSize: 13 }}>
            <a href="mailto:contato@linhacash.com" style={linkStyle}>
              contato@linhacash.com
            </a>
          </p>
          <p style={{ fontSize: 12, color: '#888888' }}>Uso responsável: o LinhaCash não é casa de apostas, não intermedia apostas e não garante resultados.</p>
          <p style={{ fontSize: 12, color: '#888888' }}>© 2026 LinhaCash. Todos os direitos reservados.</p>
        </div>
      </footer>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#f5f5f5', marginBottom: 10, borderLeft: '2px solid #22c55e', paddingLeft: 12 }}>{title}</h2>
      <div style={{ paddingLeft: 15 }}>{children}</div>
    </section>
  );
}

export const listStyle: React.CSSProperties = {
  paddingLeft: 20,
  marginTop: 8,
  display: 'grid',
  gap: 6,
};

const linkStyle: React.CSSProperties = {
  color: '#f5f5f5',
  textDecoration: 'none',
};
