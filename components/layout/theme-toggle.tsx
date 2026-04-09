'use client';

import { Moon, Sun } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';

type Theme = 'dark' | 'light';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
  root.dataset.theme = theme;
  window.localStorage.setItem('theme', theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === 'undefined') return 'dark';
    return document.documentElement.classList.contains('light') ? 'light' : 'dark';
  });

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const nextTheme: Theme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
      return nextTheme;
    });
  }, []);

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
    >
      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
      {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
    </Button>
  );
}
