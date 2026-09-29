import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Logo } from '@/components/brand';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = { title: 'Sign in' };

const HIGHLIGHTS = [
  ['Unified approvals inbox', 'Leave, expenses, requisitions and exits routed through configurable approval chains.'],
  ['Payroll with confidence', 'Formula-driven salary structures, tax slabs, LOP and one-click payroll runs.'],
  ['Talent end to end', 'Recruiting pipeline, onboarding journeys, OKRs, reviews and learning.'],
  ['People analytics', 'Headcount, attrition, diversity and engagement insights in real time.'],
];

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-sidebar p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-indigo-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -left-24 h-[28rem] w-[28rem] rounded-full bg-sky-500/15 blur-3xl" />
        <Logo inverted />
        <div className="relative mt-auto max-w-lg">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">The people platform for modern, global organizations.</h2>
          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map(([title, text]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-0.5 text-sm text-sidebar-foreground/70">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 text-xs text-sidebar-muted">© {new Date().getFullYear()} Segue. All rights reserved.</p>
      </div>
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-10 lg:hidden">
          <Logo />
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
