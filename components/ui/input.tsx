import * as React from 'react';
import { cn } from '@/lib/ui/cn';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'min-h-10 w-full border border-border bg-surface px-3 text-sm text-white placeholder:text-muted focus-visible:border-accent focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  );
});
