import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/ui/cn';

interface LinhaCashLogoProps {
  href?: string;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  ariaLabel?: string;
}

export function LinhaCashLogo({
  href = '/',
  className,
  iconClassName,
  textClassName,
  ariaLabel = 'LinhaCash',
}: LinhaCashLogoProps) {
  return (
    <Link href={href} className={cn('lc-brand', className)} aria-label={ariaLabel}>
      <span className={cn('lc-brand-icon', iconClassName)}>
        <Image src="/logo.png" alt="LinhaCash" width={24} height={24} priority />
      </span>
      <span className={cn('lc-brand-text', textClassName)}>
        Linha<span>Cash</span>
      </span>
    </Link>
  );
}
