import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { LinhaCashLogo } from '@/components/layout';

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
    <main className="lc-legal-page">
      <div className="lc-legal-shell">
        <header className="lc-legal-header">
          <LinhaCashLogo href="/" ariaLabel="LinhaCash home" />
          <p>Última atualização: {updatedAt}</p>
        </header>

        <section className="lc-legal-content">
          <h1>{title}</h1>
          <div>{children}</div>
        </section>
      </div>

      <footer className="lc-legal-footer">
        <p>
          <Link href="/termos">Termos de uso</Link> · <Link href="/privacidade">Política de privacidade</Link>
        </p>
        <p><a href="mailto:suporte@linhacash.com.br">suporte@linhacash.com.br</a></p>
        <p>Uso responsável: o LinhaCash não é casa de apostas e não garante resultados.</p>
      </footer>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="lc-legal-section">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

export const listStyle: CSSProperties = {
  paddingLeft: '1rem',
  marginTop: '0.5rem',
  display: 'grid',
  gap: '0.35rem',
};
