# Segue HRMS — API

NestJS 12 (ESM) + TypeORM. See the [root README](../README.md) for setup, architecture and demo accounts.

```bash
npm run start:dev   # http://localhost:4400/api/v1 — Swagger at /api/docs
npm run seed        # rebuild and reset the demo database
npm test            # unit tests (Vitest)
```

Each feature lives in `src/modules/<feature>/` with its own `entities/`, `dto/`, service, controller and module.
Relative imports use `.js` suffixes (Node ESM), and entity relation properties use TypeORM's `Relation<T>`
wrapper with `import type` to avoid ESM circular-import issues.
