import type { Metadata } from 'next';
import { LegalSection, listStyle, PublicLegalLayout } from '@/app/_components/public-legal-layout';

export const metadata: Metadata = {
  title: 'Termos de Uso — LinhaCash',
};

export default function TermosPage() {
  return (
    <PublicLegalLayout title="Termos de Uso" updatedAt="1 de abril de 2026">
      <LegalSection title="1. Aceitação">
        <p>Ao acessar o LinhaCash, você concorda com estes termos e com a Política de Privacidade.</p>
      </LegalSection>

      <LegalSection title="2. Natureza do serviço">
        <p>O LinhaCash oferece conteúdo informativo e analítico sobre estatísticas e props da NBA. Não operamos apostas e não garantimos resultados financeiros.</p>
      </LegalSection>

      <LegalSection title="3. Conta e acesso">
        <ul style={listStyle}>
          <li>Você é responsável por manter suas credenciais em sigilo.</li>
          <li>Não é permitido compartilhar acesso pago com terceiros sem autorização.</li>
          <li>Podemos suspender contas que violem estes termos ou a legislação vigente.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Planos, cobrança e cancelamento">
        <ul style={listStyle}>
          <li>O plano Free possui limitações de uso definidas no produto.</li>
          <li>Assinaturas Pro são processadas por parceiro de pagamento (Mercado Pago).</li>
          <li>Cancelamentos podem ser solicitados pela área logada; o acesso permanece até o fim do período já pago.</li>
        </ul>
      </LegalSection>
    </PublicLegalLayout>
  );
}
