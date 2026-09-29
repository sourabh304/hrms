'use client';

import { LogIn, LogOut, PartyPopper, Sunrise } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/misc';
import { formatTime, minutesToHours } from '@/lib/utils';
import { usePunch, useToday } from '../api';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Live clock with one-tap clock in / out. */
export function ClockCard({ compact }: { compact?: boolean }) {
  const { data, isLoading } = useToday();
  const punch = usePunch();
  const now = useNow();

  if (isLoading || !data) return <Skeleton className={compact ? 'h-40' : 'h-44'} />;

  const r = data.record;
  const worked = r?.checkIn ? Math.max(0, Math.round(((r.checkOut ? new Date(r.checkOut) : now).getTime() - new Date(r.checkIn).getTime()) / 60000)) : 0;
  const nonWorking = data.day.kind !== 'WORKING';

  const doPunch = async (kind: 'clock-in' | 'clock-out') => {
    const rec = await punch.mutateAsync(kind);
    toast.success(kind === 'clock-in' ? `Clocked in at ${formatTime(rec.checkIn)}${rec.isLate ? ' (late)' : ''}` : `Clocked out · ${minutesToHours(rec.workMinutes)} worked`);
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <p className="tabular mt-1 text-3xl font-semibold tracking-tight">{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
          </div>
          <Badge variant="neutral">
            {data.shift.name} · {data.shift.startTime}–{data.shift.endTime}
          </Badge>
        </div>

        {nonWorking && !r?.checkIn ? (
          <div className="flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-2.5 text-sm text-primary-soft-foreground">
            {data.day.kind === 'HOLIDAY' ? <PartyPopper className="h-4 w-4" /> : <Sunrise className="h-4 w-4" />}
            {data.day.kind === 'HOLIDAY' ? `Holiday — ${data.day.holiday}` : 'Weekend — enjoy your day off'}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['Check in', r?.checkIn ? formatTime(r.checkIn) : '--:--'],
              ['Check out', r?.checkOut ? formatTime(r.checkOut) : '--:--'],
              ['Worked', minutesToHours(worked)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-muted px-2 py-2">
                <p className="text-[11px] text-muted-foreground">{label}</p>
                <p className="tabular mt-0.5 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-3">
          {!r?.checkIn ? (
            <Button className="flex-1" size="lg" onClick={() => doPunch('clock-in')} loading={punch.isPending}>
              <LogIn className="h-4 w-4" /> Clock in
            </Button>
          ) : (
            <Button className="flex-1" size="lg" variant={r.checkOut ? 'outline' : 'primary'} onClick={() => doPunch('clock-out')} loading={punch.isPending}>
              <LogOut className="h-4 w-4" /> {r.checkOut ? 'Update clock out' : 'Clock out'}
            </Button>
          )}
          {r?.isLate && <Badge variant="warning">Late by {r.lateMinutes}m</Badge>}
        </div>
      </div>
    </Card>
  );
}
