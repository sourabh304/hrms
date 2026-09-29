import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} aria-hidden>
      <defs>
        <linearGradient id="segue-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d66f6" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#segue-g)" />
      <path
        d="M21.5 10.5c-1.2-1.3-3-2-5.2-2-3.2 0-5.4 1.7-5.4 4.2 0 5.3 10.4 3.1 10.4 7.4 0 1.7-1.7 2.9-4.3 2.9-2.2 0-4-.8-5.3-2.2"
        fill="none"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <div className="leading-none">
        <div className={cn('text-[15px] font-semibold tracking-tight', inverted ? 'text-white' : 'text-foreground')}>Segue</div>
        <div className={cn('mt-0.5 text-[10px] font-medium tracking-[0.18em] uppercase', inverted ? 'text-sidebar-muted' : 'text-muted-foreground')}>HRMS</div>
      </div>
    </div>
  );
}
