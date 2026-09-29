# Segue HRMS — Web

Next.js 16 App Router. See the [root README](../README.md) for setup, architecture and demo accounts.

```bash
npm run dev     # http://localhost:3000 (expects the API on API_URL, default http://localhost:4400)
npm run build
npm run lint
```

- `src/app/` holds routes only; each `page.tsx` renders a component from `src/features/<feature>/`.
- `src/features/<feature>/api.ts` contains typed TanStack Query hooks for that feature's endpoints.
- `src/components/` is the shared design system; `src/proxy.ts` is the auth gate (Next 16 "proxy").
