import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata: Metadata = {
  title: 'LinhaCash',
  description: 'Análise de props da NBA',
};

const themeBootScript = `(() => { try { const saved = localStorage.getItem('theme'); const theme = saved === 'light' ? 'light' : 'dark'; const root = document.documentElement; root.classList.add(theme); } catch (_) { document.documentElement.classList.add('dark'); } })();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jetBrainsMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
