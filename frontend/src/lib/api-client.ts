/**
 * Thin fetch wrapper for the Segue HRMS API.
 * Auth is cookie-based (httpOnly); expired access tokens are refreshed
 * transparently once and the request is retried.
 */
const BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      setTimeout(() => (refreshing = null), 0);
    });
  return refreshing;
}

function toQueryString(query?: Query) {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

function redirectToLogin() {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/login')) return;
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/login?next=${next}`);
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = BASE + path + toQueryString(options.query);
  const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const init: RequestInit = {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: isForm || options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: isForm ? (options.body as FormData) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
  };

  let res = await fetch(url, init);
  const isAuthCall = path.startsWith('/auth/login') || path.startsWith('/auth/refresh');
  if (res.status === 401 && !isAuthCall) {
    if (await refreshSession()) res = await fetch(url, init);
    if (res.status === 401) redirectToLogin();
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = Array.isArray(data.message) ? data.message.join('. ') : (data.message ?? res.statusText);
    throw new ApiError(res.status, message || 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const get = <T>(path: string, query?: Query) => api<T>(path, { query });
export const post = <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body: body ?? {} });
export const put = <T>(path: string, body?: unknown) => api<T>(path, { method: 'PUT', body });
export const patch = <T>(path: string, body?: unknown) => api<T>(path, { method: 'PATCH', body });
export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });

export async function uploadFile(file: File, visibility: 'PRIVATE' | 'COMPANY' = 'PRIVATE') {
  const form = new FormData();
  form.append('file', file);
  return api<{ id: string; url: string; originalName: string; size: number }>(`/files?visibility=${visibility}`, {
    method: 'POST',
    body: form,
  });
}

export const fileUrl = (id: string) => `${BASE}/files/${id}`;
