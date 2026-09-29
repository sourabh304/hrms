import { LogoMark } from '@/components/brand';
import { LinkButton } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark className="h-10 w-10" />
      <p className="text-5xl font-semibold tracking-tight">404</p>
      <p className="text-sm text-muted-foreground">We couldn&apos;t find the page you were looking for.</p>
      <LinkButton href="/dashboard">Back to dashboard</LinkButton>
    </div>
  );
}
