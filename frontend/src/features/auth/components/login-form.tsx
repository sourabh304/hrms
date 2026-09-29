'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form-controls';
import { errorMessage } from '@/lib/utils';
import { useLogin } from '../api';

const schema = z.object({
  email: z.email('Enter a valid work email'),
  password: z.string().min(1, 'Password is required'),
});

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', email: 'admin@segueit.com' },
  { label: 'HR Admin', email: 'hr@segueit.com' },
  { label: 'Manager', email: 'manager@segueit.com' },
  { label: 'Employee', email: 'employee@segueit.com' },
  { label: 'Payroll', email: 'payroll@segueit.com' },
  { label: 'Finance', email: 'finance@segueit.com' },
  { label: 'Recruiter', email: 'recruiter@segueit.com' },
  { label: 'IT Admin', email: 'it@segueit.com' },
];

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const onSubmit = form.handleSubmit(async (values) => {
    await login.mutateAsync(values);
    const next = params.get('next');
    router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
  });

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your Segue HRMS workspace.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <Field label="Work email" error={form.formState.errors.email?.message} htmlFor="email">
          <Input id="email" type="email" autoComplete="username" placeholder="you@company.com" aria-invalid={!!form.formState.errors.email} {...form.register('email')} />
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message} htmlFor="password">
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-10"
              aria-invalid={!!form.formState.errors.password}
              {...form.register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {login.error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {errorMessage(login.error)}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
          Sign in <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className="mt-8 rounded-xl border border-dashed border-border p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> Demo accounts · password <code className="rounded bg-muted px-1 font-mono">Segue@123</code>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                form.setValue('email', a.email);
                form.setValue('password', 'Segue@123');
              }}
              className="cursor-pointer rounded-md border border-border px-2 py-1.5 text-left text-xs transition-colors hover:border-primary hover:bg-primary-soft"
            >
              <span className="font-medium">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
