'use client';

import { addMonths, eachDayOfInterval, endOfMonth, format, isWeekend, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState, PersonCell, Skeleton } from '@/components/ui/misc';
import { cn, formatDate } from '@/lib/utils';
import { useLeaveCalendar } from '../api';

/** "Who's out" timeline: one row per person, one column per day. */
export function TeamCalendar({ scope = 'team' }: { scope?: 'team' | 'all' }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const from = format(cursor, 'yyyy-MM-dd');
  const to = format(endOfMonth(cursor), 'yyyy-MM-dd');
  const { data = [], isLoading } = useLeaveCalendar(from, to, scope);
  const days = eachDayOfInterval({ start: cursor, end: endOfMonth(cursor) });
  const today = format(new Date(), 'yyyy-MM-dd');

  const people = useMemo(() => {
    const map = new Map<string, { employee: (typeof data)[number]['employee']; leaves: typeof data }>();
    for (const l of data) {
      const entry = map.get(l.employeeId) ?? { employee: l.employee, leaves: [] };
      entry.leaves.push(l);
      map.set(l.employeeId, entry);
    }
    return [...map.values()].sort((a, b) => a.employee.fullName.localeCompare(b.employee.fullName));
  }, [data]);

  return (
    <Card>
      <CardHeader
        title={`Who's out · ${format(cursor, 'MMMM yyyy')}`}
        description={scope === 'team' ? 'Your team and peers' : 'Entire organization'}
        action={
          <div className="flex gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => setCursor(addMonths(cursor, -1))} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>This month</Button>
            <Button variant="outline" size="icon-sm" onClick={() => setCursor(addMonths(cursor, 1))} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        }
      />
      {isLoading ? (
        <Skeleton className="m-5 h-48" />
      ) : !people.length ? (
        <EmptyState icon={Users} title="Everyone's in this month" />
      ) : (
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-52 bg-card px-4 py-2 text-left font-medium text-muted-foreground">Employee</th>
                {days.map((d) => (
                  <th key={d.toISOString()} className={cn('w-7 min-w-7 px-0 py-2 text-center font-normal', isWeekend(d) ? 'text-muted-foreground/50' : 'text-muted-foreground', format(d, 'yyyy-MM-dd') === today && 'font-bold text-primary')}>
                    <div>{format(d, 'EEEEE')}</div>
                    <div>{format(d, 'd')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people.map(({ employee, leaves }) => (
                <tr key={employee.id} className="border-t border-border">
                  <td className="sticky left-0 z-10 bg-card px-4 py-2">
                    <PersonCell name={employee.fullName} src={employee.avatarUrl} subtitle={employee.designation?.title} size="xs" />
                  </td>
                  {days.map((d) => {
                    const iso = format(d, 'yyyy-MM-dd');
                    const leave = leaves.find((l) => l.startDate <= iso && l.endDate >= iso);
                    return (
                      <td key={iso} className={cn('h-10 px-0.5', isWeekend(d) && 'bg-muted/40')}>
                        {leave && !isWeekend(d) && (
                          <div
                            title={`${leave.leaveType.name} · ${formatDate(leave.startDate)} – ${formatDate(leave.endDate)} (${leave.status.toLowerCase()})`}
                            className={cn('h-5 rounded', leave.status === 'PENDING' && 'opacity-50 [background-image:repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(255,255,255,.5)_3px,rgba(255,255,255,.5)_6px)]')}
                            style={{ backgroundColor: leave.leaveType.color }}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-4 border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
            {[...new Map(data.map((l) => [l.leaveType.id, l.leaveType])).values()].map((t) => (
              <span key={t.id} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: t.color }} />{t.name}</span>
            ))}
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-muted-foreground/40 [background-image:repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(255,255,255,.6)_2px,rgba(255,255,255,.6)_4px)]" />Pending approval</span>
          </div>
        </div>
      )}
    </Card>
  );
}
