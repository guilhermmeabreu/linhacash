import * as React from 'react';
import { cn } from '@/lib/ui/cn';

type BadgeVariant = 'default' | 'success' | 'muted' | 'danger';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'border-border bg-surface text-white',
  success: 'border-accent/40 bg-accent/15 text-accent',
  muted: 'border-border text-muted',
  danger: 'border-red-500/40 bg-red-500/10 text-red-300',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
