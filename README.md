# Segue HRMS

Enterprise human capital management platform — **NestJS 12** API + **Next.js 16 (App Router)** web app.
Feature scope and UX patterns are modelled on the enterprise HCM leaders (Workday, SAP SuccessFactors,
Oracle HCM) and Darwinbox; see [Research basis](#research-basis).

## Quick start

Requirements: Node.js 20+ (tested on Node 24). No database install needed for local dev (embedded SQLite).

```bash
npm run setup   # installs both apps, creates .env files, seeds demo data
npm run dev     # API on http://localhost:4400, web on http://localhost:3000
```

| URL | What |
|---|---|
| http://localhost:3000 | Web app (sign in with a demo account below) |
| http://localhost:3000/careers | Public careers site (no login) |
| http://localhost:4400/api/docs | Swagger / OpenAPI docs for every endpoint |

### Demo accounts (password `Segue@123`)

| Persona | Email | What to try |
|---|---|---|
| Super admin (CEO) | admin@segueit.com | Everything; skip-level approval of a large expense in **Inbox** |
| HR admin | hr@segueit.com | Analytics, approve the SRE requisition & a resignation, launch review cycles, settings |
| Manager | manager@segueit.com | Inbox (leave, expense, attendance correction), team calendar, team reviews |
| Employee | employee@segueit.com | Clock in, request leave, submit expenses, self-review, acknowledge policies |
| Payroll admin | payroll@segueit.com | **Run payroll** for the current month → process → mark paid |
| Finance | finance@segueit.com | Finance verification step for expenses, reimbursements |
| Recruiter | recruiter@segueit.com | Kanban pipeline, interviews, make offer → **hire** (creates employee + onboarding) |
| IT admin | it@segueit.com | Asset inventory/assignment, IT helpdesk tickets |

Every other seeded employee can sign in as `firstname.lastname@segueit.com` with the same password.
Re-run `npm run seed` any time to reset the demo tenant (it drops and recreates all tables).

## Features

| Area | Module | Highlights |
|---|---|---|
| Core HR | Employees, Org chart, Organization | Directory with filters & CSV export, privacy-aware profiles, job-history timeline (hire/promotion/transfer/comp change), interactive org chart, departments/designations/locations, company settings |
| Workflow | Inbox & approval engine | Workday-style business processes: configurable multi-step chains (manager, skip-level, department head, role) with conditions (e.g. *leave > 5 days → HR*, *expense > 2,000 → skip-level*), consolidated bulk approvals, full audit of each step |
| Time | Attendance, Leave, Holidays | Clock in/out with shift & grace-period lateness, monthly timesheet calendar, team roster, regularization via workflow; leave policies with pro-rated accrual, carry-forward, half-days, holiday/weekend-aware day counting, "Who's out" calendar; location-specific holiday calendars |
| Pay | Payroll, Payslips, Expenses | Formula-driven salary structures (% of CTC / % of basic / fixed / balancing), progressive tax slabs, LOP & joiner/leaver pro-ration, DRAFT → PROCESSED → PAID runs with register export, printable payslips; expense claims with receipts, approval chain, reimbursement |
| Talent | Recruitment, Onboarding, Offboarding, Performance, Learning | Requisition approvals, drag-and-drop Kanban ATS, interview scorecards, referrals, public careers site, one-click hire; templated onboarding/offboarding journeys auto-assigned to HR/IT/Finance/manager/employee; resignation workflow, exit interviews, clearance; OKR goals aligned to company goals, self → manager reviews, calibration, continuous feedback; course catalog, mandatory compliance training |
| Experience | Dashboard, Helpdesk, Announcements, Engagement, Documents | Role-aware home, HR/IT ticketing with SLAs & CSAT, targeted announcements, kudos wall, anonymous pulse surveys with eNPS, policy library with acknowledgment tracking |
| Insights & admin | Analytics, Audit logs, Settings | Headcount/attrition/diversity/tenure/leave/payroll analytics, redacted audit trail of every mutation, users & roles, permission matrix, approval-workflow editor |

## Architecture

```
hrms/
├── backend/                     NestJS 12 (ESM, TypeScript 6), TypeORM 1.x
│   └── src/
│       ├── common/              RBAC model, guards, decorators, pagination, scoping, filters
│       ├── config/ database/    configuration, DB wiring, seed script
│       └── modules/<feature>/   one folder per feature: entities/ dto/ *.service *.controller *.module
└── frontend/                    Next.js 16 App Router, React 19, Tailwind 4, TanStack Query
    └── src/
        ├── app/                 routes only — thin pages that render a feature component
        │   ├── (auth)/login     (public)/careers     (app)/<route>  ← authenticated shell
        ├── features/<feature>/  api.ts (typed hooks) + components/ — all feature logic lives here
        ├── components/          design system (ui/), charts, app shell (layout/)
        └── proxy.ts             auth gate (Next 16's replacement for middleware)
```

**Backend**
- `modules/`: auth, users, organization, employees, workflow, notifications, audit, holidays, attendance, leave,
  payroll, expenses, recruitment, onboarding, offboarding, performance, learning, assets, helpdesk,
  announcements, engagement, documents (incl. secure file storage), analytics, health.
- **Auth**: short-lived JWT access token + rotating refresh token in httpOnly cookies; refresh-token reuse
  revokes the session; Bearer tokens also accepted for API clients.
- **RBAC**: roles map to permissions (`common/auth/roles.ts`); manager scope is derived from the reporting
  line; personal/bank fields are stripped for viewers without a need to know.
- **Decoupling**: features never call each other's approval logic — the workflow engine emits
  `workflow.decided`, and each feature listens and updates its own records. New hires emit
  `employee.created`, which starts onboarding.
- **Hardening**: Helmet, rate limiting (stricter on login and public apply), whitelist validation on every
  DTO, DB errors mapped to 409/404, upload type/size limits with access-checked downloads, audit logging.

**Frontend**
- Same-origin API via a Next rewrite (`/api/*` → NestJS), so auth cookies are first-party.
- Design tokens with light/dark themes; chart colors are a validated colorblind-safe palette.
- ⌘K / Ctrl+K command palette for people and pages; notifications center; responsive down to mobile.

## Configuration

`backend/.env` (created from `.env.example` by `npm run setup`):

| Variable | Default | Notes |
|---|---|---|
| `PORT` | 4400 | API port |
| `DB_TYPE` | sqlite | `sqlite` for local dev, `postgres` for staging/production |
| `DATABASE_URL` | — | Postgres connection string when `DB_TYPE=postgres` |
| `DB_SYNCHRONIZE` | true | Auto-creates schema from entities. **Set to false in production** and manage schema with migrations |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | placeholders | **Replace** with long random values outside local dev |
| `COOKIE_SECURE` | false | Set `true` behind HTTPS |
| `CORS_ORIGIN` | http://localhost:3000 | Only needed for non-browser-rewrite clients |

`frontend/.env.local`: `API_URL` — where the Next server proxies `/api/*` (default `http://localhost:4400`).

Company-level settings (currency, weekly offs, tax slabs, probation/notice periods, email domain,
employee-code prefix) are edited in-app under **Settings → Company**.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Both apps in watch mode |
| `npm run seed` | Rebuild the API and reset the demo database |
| `npm test` | Backend unit tests (Vitest) |
| `npm run build` / `npm start` | Production build / run both apps |

## Research basis

Feature scope was derived from public comparisons of the enterprise HCM market and vendor module lists:
- [Workday vs Oracle HCM vs SAP SuccessFactors (OutSail, 2026)](https://www.outsail.co/post/workday-vs-oracle-hcm-vs-sap-successfactors-comparison-2026)
- [Top HRMS modules for enterprises (Darwinbox)](https://darwinbox.com/blog/top-hr-modules)
- [Workday Business Process Framework](https://doc.workday.com/workday-education/en-us/course-manuals/hcm-core-for-administrators/business-process-framework.html)
- [Workday HCM overview](https://www.workday.com/en-us/products/human-capital-management/overview.html)

No vendor code, branding or assets were copied; Segue HRMS is an original implementation of the common
feature set these products share.
