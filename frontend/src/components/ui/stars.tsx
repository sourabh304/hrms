import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

/** 1–5 star rating; interactive only when `onChange` is provided. */
export function Stars({ value, onChange, size = 'h-4 w-4' }: { value: number | null; onChange?: (n: number) => void; size?: string }) {
  const icon = (n: number) => <Star className={cn(size, n <= (value ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')} />;

  if (!onChange) {
    // Read-only: plain elements so it can sit inside links and clickable cards.
    return (
      <span className="flex" role="img" aria-label={value ? `${value} out of 5` : 'Not rated'}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className="p-0.5">{icon(n)}</span>
        ))}
      </span>
    );
  }

  return (
    <div className="flex" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} onClick={() => onChange(n)} className="cursor-pointer p-0.5" aria-label={`${n} star${n > 1 ? 's' : ''}`}>
          {icon(n)}
        </button>
      ))}
    </div>
  );
}
