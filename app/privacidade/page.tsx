import type { Metadata } from 'next';
import { LegalSection, listStyle, PublicLegalLayout } from '@/app/_components/public-legal-layout';

export const metadata: Metadata = {
  title: 'Política de Privacidade — LinhaCash',
};

export default function PrivacidadePage() {
  return (
    <PublicLegalLayout title="Política de Privacidade" updatedAt="1 de abril de 2026">
      <LegalSection title="1. Escopo desta política">
        <p>Esta política explica como o LinhaCash coleta, usa, compartilha e protege dados pessoais ao utilizar nosso site, landing page, aplicativo e canais de suporte.</p>
      </LegalSection>

      <LegalSection title="2. Dados coletados">
        <ul style={listStyle}>
          <li><strong>Cadastro e autenticação:</strong> nome, email e credenciais para login.</li>
          <li><strong>Assinatura e pagamentos:</strong> status do plano e eventos de pagamento processados pelo Mercado Pago.</li>
          <li><strong>Eventos de uso:</strong> interações com páginas, botões e recursos para análises de produto e prevenção de abuso.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Compartilhamento com terceiros">
        <p>Podemos compartilhar dados com provedores necessários para operar o serviço, como Supabase, Vercel e Mercado Pago. Não vendemos dados pessoais.</p>
      </LegalSection>

      <LegalSection title="4. Direitos do titular">
        <p>Você pode solicitar confirmação de tratamento, acesso, correção, portabilidade, oposição e exclusão de dados pelo email <a href="mailto:suporte@linhacash.com.br" style={{ color: '#00e676', textDecoration: 'none' }}>suporte@linhacash.com.br</a>.</p>
      </LegalSection>
    </PublicLegalLayout>
  );
}
