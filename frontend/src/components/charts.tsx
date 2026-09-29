'use client';

import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';

/**
 * Chart primitives. Colors come from the validated `--series-N` tokens in fixed
 * order (never cycled); gridlines are hairline and recessive; every plot has a
 * hover tooltip; legends appear only for two or more series.
 */
export const seriesColor = (slot: number) => `var(--series-${Math.min(slot, 8)})`;

type Format = (v: number) => string;
const defaultFormat: Format = (v) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(v);

const axis = {
  tick: { fill: 'var(--chart-axis)', fontSize: 11 },
  axisLine: false,
  tickLine: false,
} as const;

interface TooltipEntry {
  name?: string | number;
  value?: number | string | readonly (number | string)[];
  color?: string;
  dataKey?: unknown;
}

function ChartTooltip({ active, payload, label, format }: { active?: boolean; payload?: readonly TooltipEntry[]; label?: ReactNode; format: Format }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <p className="mb-1.5 font-medium text-foreground">{label}</p>}
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="flex-1 text-muted-foreground">{p.name}</span>
            <span className="tabular font-medium text-foreground">{typeof p.value === 'number' ? format(p.value) : String(p.value ?? '')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartLegend({ items }: { items: { name: string; slot: number }[] }) {
  if (items.length < 2) return null;
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.name} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: seriesColor(i.slot) }} />
          {i.name}
        </li>
      ))}
    </ul>
  );
}

interface SeriesDef {
  key: string;
  name: string;
}

/** Single-series trend with a light area wash and a crosshair tooltip. */
export function TrendChart({
  data,
  xKey,
  yKey,
  name,
  height = 240,
  format = defaultFormat,
}: {
  data: object[];
  xKey: string;
  yKey: string;
  name: string;
  height?: number;
  format?: Format;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id={`fill-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={seriesColor(1)} stopOpacity={0.14} />
            <stop offset="1" stopColor={seriesColor(1)} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis dataKey={xKey} {...axis} />
        <YAxis {...axis} tickFormatter={format} width={48} allowDecimals={false} />
        <Tooltip cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }} content={(p) => <ChartTooltip {...p} format={format} />} />
        <Area
          type="monotone"
          dataKey={yKey}
          name={name}
          stroke={seriesColor(1)}
          strokeWidth={2}
          fill={`url(#fill-${yKey})`}
          activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Grouped (or stacked) columns sharing one axis. */
export function ColumnChart({
  data,
  xKey,
  series,
  stacked,
  height = 240,
  format = defaultFormat,
}: {
  data: object[];
  xKey: string;
  series: SeriesDef[];
  stacked?: boolean;
  height?: number;
  format?: Format;
}) {
  return (
    <div>
      <ChartLegend items={series.map((s, i) => ({ name: s.name, slot: i + 1 }))} />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey={xKey} {...axis} />
          <YAxis {...axis} tickFormatter={format} width={48} allowDecimals={false} />
          <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.6 }} content={(p) => <ChartTooltip {...p} format={format} />} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={seriesColor(i + 1)}
              maxBarSize={24}
              stackId={stacked ? 'stack' : undefined}
              // Rounded data-end only; stacked segments are separated by a 2px surface gap.
              radius={stacked ? (i === series.length - 1 ? [4, 4, 0, 0] : 0) : [4, 4, 0, 0]}
              stroke={stacked ? 'var(--card)' : undefined}
              strokeWidth={stacked ? 2 : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Two or more lines on one shared axis (same unit). */
export function MultiLineChart({
  data,
  xKey,
  series,
  height = 240,
  format = defaultFormat,
}: {
  data: object[];
  xKey: string;
  series: SeriesDef[];
  height?: number;
  format?: Format;
}) {
  return (
    <div>
      <ChartLegend items={series.map((s, i) => ({ name: s.name, slot: i + 1 }))} />
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey={xKey} {...axis} />
          <YAxis {...axis} tickFormatter={format} width={56} />
          <Tooltip cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }} content={(p) => <ChartTooltip {...p} format={format} />} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={seriesColor(i + 1)}
              strokeWidth={2}
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Horizontal magnitude bars rendered in HTML: every row carries a direct text
 * label and value, so it doubles as the accessible table view.
 */
export function BarList({
  items,
  format = defaultFormat,
  className,
}: {
  items: { name: string; value: number; hint?: string }[];
  format?: Format;
  className?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn('space-y-2.5', className)}>
      {items.map((i) => (
        <li key={i.name} className="group" title={`${i.name}: ${format(i.value)}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-foreground">{i.name}</span>
            <span className="tabular shrink-0 font-medium text-foreground">
              {format(i.value)}
              {i.hint && <span className="ml-1 font-normal text-muted-foreground">{i.hint}</span>}
            </span>
          </div>
          <div className="h-2 w-full rounded-r bg-muted/70">
            <div
              className="h-2 rounded-r transition-opacity group-hover:opacity-80"
              style={{ width: `${(i.value / max) * 100}%`, background: seriesColor(1), minWidth: i.value ? 4 : 0 }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
