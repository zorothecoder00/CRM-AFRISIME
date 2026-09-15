@AGENTS.md

# AfriFlow (AfriSime Work-Space)

## What this is
Collaborative project/task/performance management platform for AfriSime (inspired by Asana/ClickUp/Monday/Notion/Trello, adapted to AfriSime's own workflow). ~70 top-level modules under `src/app/(app)/*`, ~150 Prisma models, 7200+ line schema, 340+ commits.

**Not AfriGes** — a separate sister ERP repo/project by the same user. Watch out for mixed-up `DATABASE_URL`s between the two when running migrations; a past session accidentally ran this repo's `migrate deploy` against AfriGes' DB.

## Stack
- Next.js 16 (App Router, Turbopack — see `AGENTS.md` above, breaking changes vs training data), React 19, TypeScript, Tailwind 4 + shadcn/ui (Radix, "Nova" preset)
- Prisma 7, `prisma-client` generator (output `src/generated/prisma`, gitignored) + `@prisma/adapter-pg` driver adapter
- NextAuth v4 (not v5/Auth.js) — Credentials provider only, JWT session strategy, TOTP MFA (`otplib`)
- PostgreSQL: local via pgAdmin (db `afriflow`), prod on Neon
- `next-intl`, non-routing mode, French only — only sidebar nav (`nav-config.ts`) is under `messages/fr.json`; the rest of the app is still inline French strings
- Web Push (`web-push` + VAPID) — real and working, self-serve opt-in only. Resend for email (currently disabled, no key). No SMS/WhatsApp provider.
- Vitest (unit + integration) — no true browser/e2e suite exists in the repo

## Directory map
- `src/app/(app)/*` — ~70 authenticated modules (dashboard, projets, taches, crm, administration, gouvernance, etc.)
- `src/app/portail/*` — external portal, ONE shared system serving Client/Partenaire/Fournisseur/Investisseur/Institution profiles (not 5 separate systems) — authorization keyed off `ProjectStakeholder`/`Stakeholder` contact linkage, see `src/lib/portal-authorization.ts` / `portal-nav-visibility.ts`
- `src/actions/*.ts` — Server Actions (`"use server"`), one file per domain. Standard shape: get session → `requirePermission` → zod `.parse` → prisma write → `logAudit` → `revalidatePath`
- `src/lib/*.ts` — business logic / computation engines, one file per concern (health-score, workload, automation, etc.)
- `src/lib/validations/*.schema.ts` — zod schemas, the actions' actual source of truth for accepted input
- `src/components/**` — mirrors `src/app` structure, one subfolder per domain
- `prisma/schema.prisma` — ~150 models; heavily commented with rationale and cahier-des-charges references (dev-only, never rendered — keep it that way, see the UI-text rule below)
- `prisma/seed.ts` — demo accounts, see credentials below. LOCAL ONLY (see workflow rules)
- `scripts/*.ts` — one-off/setup scripts: `migrate-deploy-neon`, `sync-role-permissions`, `setup-local-rls-test-role` / `setup-production-tenant-role`, `backfill-platform-organization`, etc.

## Cahier des charges — several separate documents coexist
This app was built against MULTIPLE independent specs pasted by the user over time, not one continuous document. A section number alone doesn't identify which doc it belongs to:

1. **Base (24 §) + v2.0 extension** (20 new dimensions) — CLOSED 2026-08-14. Only AI-dependent gaps remain.
2. **V2.2** ("orchestration", §1-43 + §37 rétention) — CLOSED 2026-08-18. Only gap: no LLM key.
3. **V3.0** ("Enterprise & Organizational Intelligence OS", §1-55 + §58 — §28-31/§56-57 don't exist in the source) — CLOSED 2026-08-19.
4. **Project Studio** (separate doc: idée→diagnostic→conception→...→impact, 27-section target menu) — IN PROGRESS, sent section-by-section by the user, §1-40 built as of the last update. Two deliberate name collisions to remember: `ChangeRequest` (org-wide HR/comms) vs `ProjectChangeRequest` (project scope/budget/schedule) — always check for a `projectId` field before assuming which one applies; same for `Contract` (CRM sales, tied to `CrmOpportunity`) vs `ProjectContract` (procurement).
5. **Module Planning personnel** (separate doc, §1-52, §49-51 never actually pasted) — CLOSED 2026-08-28.

**Before assuming a section is unbuilt, grep for the relevant model/lib file first.** Across every document above, a large fraction of "new" sections turned out to already exist from an earlier doc and only needed a small extension (new field, new nav entry) rather than a new build — this pattern recurred constantly (e.g. V2.2 §32/38/39/40, V3.0 §37/39/40/50, Project Studio §30/37/39, Planning personnel segments 3-5).

**User-facing UI text must never cite a cahier-des-charges section** (fixed 2026-09-15 — 23 page subtitles/labels showed "(cahier des charges §X)" to end users, unprofessional). Code comments citing it for developer context are fine and expected; anything inside JSX that actually renders is not.

## Standing gaps (all deliberate scope calls, not oversights)
- **No LLM/AI API key.** Every "IA"/predictive/conversational/semantic-search feature across the whole app is a deterministic heuristic or templated text, never a real model call — this is the single most repeated documented gap across every cahier des charges above (conseiller stratégique, briefings, search, assistant vocal, orchestrateur IA agents, etc.). If asked to add AI, don't fake it silently — either ask for a key or extend the heuristic pattern and label it honestly in the UI, matching existing practice.
- **No email/SMS/WhatsApp provider configured.** `sendEmail` (Resend) needs `EMAIL_ENABLED=true` + `RESEND_API_KEY`, neither set. SMS/WhatsApp have no provider integration at all. `attemptExternalDelivery` (`src/lib/notify.ts`) journals the attempt and no-ops. Password recovery has an admin-assisted fallback instead (`generatePasswordResetLink` → link shown in `/administration/utilisateurs` for manual transmission) — this is the only real recovery path today, not a bug.
- **Push notifications DO work** (real Web Push, VAPID keys configured, service worker at `public/sw.js`) — opt-in is per-device via `/parametres/notifications`. Adoption rate and delivery failures are now visible at `/administration/securite` (previously a complete blind spot).
- **Multi-tenant isolation is partial.** Phase 1 (schema `organizationId` + RLS policies) is closed on 129/138 models. Phase 2 (wiring `withTenantScopedSession` into call sites) only covers `project.actions.ts`/`task.actions.ts` plus a handful of admin pages added since — most of the app still queries through the unscoped global `prisma` client. Harmless today (one real organization in prod) but not real isolation if a second org is ever onboarded. See `src/lib/tenant-scoped-prisma.ts` and `scripts/lib/multi-tenant-tables.ts`'s `COVERED_TABLES` — the tenant-scoped Postgres role only has grants on that list; querying anything outside it (e.g. `Role`, `PushSubscription`) through the `tx` inside `withTenantScopedSession` throws "permission denied", not a silent failure.
- **Zero true browser/e2e tests.** Vitest covers unit + integration only. All UI verification historically has been manual — curl-based authenticated smoke tests, or Playwright when actually installed in the environment (often isn't by default in this Windows/Git-Bash setup; `npx playwright install chromium` downloads ~250MB the first time).
- **No currency conversion.** Devise is configurable (org-wide + optionally per-`Entity`) but amounts aren't converted across different devises, only labeled.
- **`PlatformOrganization`** is a branding/subscription registry only, not itself the multi-tenant data-isolation mechanism (that's the Phase 1/2 RLS work above).

## Recurring gotchas (check before touching related code)
- **A new permission key does nothing until it's seeded**, even for `SUPER_ADMIN`. Adding it to `PERMISSIONS`/`PERMISSION_CATALOG`/`DEFAULT_ROLE_PERMISSIONS` in `src/lib/permissions.ts` only changes the code-time catalog — `session.user.permissions` is loaded from the DB `RolePermission` table at login. Run `npm run db:seed` locally (idempotent). For prod, never full-reseed (see below) — write a small scoped script replicating `seed.ts`'s upsert logic filtered to just the new keys (see `scripts/sync-role-permissions.ts` for the pattern).
- **`Decimal` fields can't cross a Server Action → Client Component return raw.** Convert to `Number` first or the client silently breaks.
- **`tsc --noEmit` can false-pass on a stale incremental cache.** Clear `tsconfig.tsbuildinfo` or trust `npm run build` for a final check.
- **RHF `reset()` after submit must pass every field an explicit value** (empty string, not `undefined`) or stale values from a previous open can leak into the next use of a reopened dialog.
- **`register(field, { valueAsNumber: true })` on an empty optional number input silently produces `NaN`**, which fails zod with zero visible error (submit just does nothing). Use `setValueAs: (v) => (v === "" ? undefined : Number(v))`.
- **Automation config has 3 separate sources of truth** that must all be updated together when adding a trigger/action/condition-field: the Prisma enum, the Zod schema (`automation.schema.ts`), and the UI's own hand-duplicated list — `CONDITION_FIELD_OPTIONS` in `rule-form-dialog.tsx` is what the UI actually reads, NOT the more official-looking `CONDITION_FIELDS_BY_ENTITY`.
- **Sensitive automation/orchestration actions require human validation, always** — standing rule, not scoped to one cahier section. The AI-governance 3-level gate (`niveauIA` + `SENSITIVE_ACTION_TYPES` in `src/lib/automation.ts`) forces `VALIDATION` for status-change/validation-request/email-send-class actions regardless of a rule's configured level.
- **`revalidatePath` cannot be called from a bare Server Component render**, only from Server Actions/route handlers — a "mark as read on page view" function must skip it.
- **A prop containing functions can't cross Server → Client Component.** Define it inside the client file, or mark the whole containing file `"use client"`.
- **A new top-level `app/*` route (manifest, robots.txt, sitemap) needs checking against `src/proxy.ts`'s auth-guard matcher**, which defaults to guarding everything except `api|_next/static|_next/image|favicon.ico`.

## Workflow rules
- Space out full `next build` runs — batch verification at the end of a work session, not after every small change. Same for `tsc`/`eslint`.
- `fichier.txt` / `cdc.txt` at the repo root are scratch capture buffers for pasted cahier-des-charges text — never `git add`/commit them.
- **Never run full `npm run db:seed` against production** — it creates a demo `SUPER_ADMIN` with a public password. Use a scoped targeted sync script instead.
- Render+screenshot a referenced HTML prototype with Playwright before implementing a UI from it — don't infer layout from CSS source alone.
- Don't run unsolicited Playwright/browser verification after implementing a change — only when explicitly asked (costs meaningful time/tokens); `tsc`+build+direct DB/log checks are the default verification bar.

## Dev credentials (local only, from `prisma/seed.ts`)
Password `Password123!` for all: `admin@afriflow.local` (SUPER_ADMIN), `dg@afriflow.local` (DIRECTEUR_GENERAL), `chefprojet@afriflow.local`, `manager@afriflow.local` (MFA demo-enabled, TOTP secret `JBSWY3DPEHPK3PXP`), `collaborateur@afriflow.local`, `invite@afriflow.local`.
