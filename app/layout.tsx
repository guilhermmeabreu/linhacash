import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LinhaCash',
  description: 'Análise de props da NBA',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
