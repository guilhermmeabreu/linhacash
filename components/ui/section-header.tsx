import * as React from 'react';
import { cn } from '@/lib/ui/cn';

interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  heading: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export function SectionHeader({ className, heading, subtitle, actions, ...props }: SectionHeaderProps) {
  return (
    <div className={cn('lc-section-header', className)} {...props}>
      <div>
        <h2 className="lc-section-title">{heading}</h2>
        {subtitle ? <p className="lc-section-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="lc-section-actions">{actions}</div> : null}
    </div>
  );
}
