import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import type { AuthUser } from '../../common/auth/auth-user.js';
import { AuditService } from './audit.service.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const REDACT = /password|token|secret|accountNumber/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 3 || value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      REDACT.test(k) ? '[REDACTED]' : redact(v, depth + 1),
    ]),
  );
}

/** Command-style endpoints that are not preceded by an entity id. */
const COMMANDS = new Set([
  'login', 'logout', 'refresh', 'change-password', 'clock-in', 'clock-out',
  'read-all', 'allocate', 'bulk', 'resign', 'assign', 'mark-paid',
]);

/**
 * Derive a readable resource/action from the URL:
 *   POST /api/v1/leave/requests               → leave/requests · CREATE
 *   POST /api/v1/workflow/requests/:id/approve → workflow/requests · APPROVE
 *   POST /api/v1/attendance/clock-in          → attendance · CLOCK_IN
 */
function describe(req: Request) {
  const segments = req.path.split('/').filter(Boolean).slice(2); // drop api/v1
  const resourceId = segments.find((s) => UUID.test(s)) ?? null;
  const last = segments[segments.length - 1];
  const prev = segments[segments.length - 2];
  const isCommand = !!last && !UUID.test(last) && ((!!prev && UUID.test(prev)) || COMMANDS.has(last));

  const named = segments.filter((s) => !UUID.test(s));
  const resource = (isCommand ? named.slice(0, -1) : named).slice(0, 2).join('/') || 'root';
  const action = isCommand
    ? last.toUpperCase().replace(/-/g, '_')
    : { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' }[req.method] ?? req.method;
  return { resource: resource.slice(0, 60), resourceId, action: action.slice(0, 40) };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    if (!MUTATING.has(req.method)) return next.handle();

    const write = (statusCode: number) => {
      const { resource, resourceId, action } = describe(req);
      const user = req.user;
      this.audit.record({
        userId: user?.id ?? null,
        userEmail: user?.email ?? (typeof req.body?.email === 'string' ? req.body.email : null),
        action,
        resource,
        resourceId,
        method: req.method,
        path: req.originalUrl.slice(0, 300),
        statusCode,
        ip: (req.ip ?? '').slice(0, 60) || null,
        userAgent: (req.headers['user-agent'] ?? '').slice(0, 300) || null,
        payload: req.body && Object.keys(req.body).length ? (redact(req.body) as Record<string, unknown>) : null,
      });
    };

    return next.handle().pipe(
      tap({
        next: () => write(context.switchToHttp().getResponse<Response>().statusCode),
        error: (err: { status?: number; getStatus?: () => number }) =>
          write(err.getStatus?.() ?? err.status ?? 500),
      }),
    );
  }
}
