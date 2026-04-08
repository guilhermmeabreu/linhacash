import * as React from 'react';
import { cn } from '@/lib/ui/cn';

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Surface({ className, elevated = false, ...props }: SurfaceProps) {
  return (
    <div
      className={cn(
        'border border-border bg-surface p-4',
        elevated && 'border-zinc-800 bg-zinc-950 shadow-[0_8px_24px_rgba(0,0,0,0.28)]',
        className,
      )}
      {...props}
    />
  );
}
