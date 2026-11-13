# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Current status (read me first — remove once done)

**Last updated: 2026-11-13.** Picking up on another machine? This is where things stand.

### Hosting — resolved (2026-11-13)
The auto-pause blocker is fixed. Both halves of the app now live under the client's paid accounts:
- **Supabase:** project `hawjvztlmfmogxmtpxcn` was transferred into the client's **Pro** org (Pro orgs never auto-pause) and upgraded Nano → **Micro** compute (free with Pro). Project ref/URL/keys unchanged.
- **Vercel:** project `bajen-invoice` was transferred into the client's **Pro** team (`fatou`). Env vars, deployments, `bajen-invoice.vercel.app` and the GitHub connection (`MouhamedMboup/bajen-invoice`, push to `main` → production) carried over.

No code or env var changes were needed. Local setup on a fresh machine still requires `.env.local` (not in git), `npm install`, and `npx prisma generate`.

### Feature work — shipped to production (2026-11-13)
Spec: `docs/superpowers/specs/2026-11-13-invoice-list-and-customer-profile-design.md` · Plan: `docs/superpowers/plans/2026-11-13-invoice-list-and-customer-profile.md`. Merged into `main` and pushed (live on `bajen-invoice.vercel.app`):

1. **Delete button on the Invoices list** — confirmation Dialog, revalidates in place.
2. **Yearly grouping on `/invoices`** — newest year first, each header shows that year's outstanding balance (New York year of `createdAt`).
3. **Customer profile page** `/customers/[id]` — contact card, stat tiles, invoices by year, payment history.
4. **Reset script** `scripts/reset-invoices.ts` — run once with `--confirm` on 2026-11-13; numbering restarted at `INV-0001`.
5. Also: show/hide password toggle on login and set-password pages; New York dates; `-$50.00` money format; plain objects (no Prisma Decimals) passed to invoice forms.

### Open items
- **Client is testing the live app with throwaway invoices.** Before she presents it to Aisha, run `npx tsx scripts/reset-invoices.ts --confirm` again so Aisha's first invoice is `INV-0001`, and delete any test customers/products by hand in the app. (Chosen over building a Draft/finalize feature — the `DRAFT` status exists but drafts still consume a number.)
  - **Running the reset from a fresh clone:** copy `.env.local` from an existing machine (not in git — the script reads `DATABASE_URL` from it, which points at the production DB), then `npm install` → `npx prisma generate` → `npx tsx scripts/reset-invoices.ts` (dry run; should print current counts) → `npx tsx scripts/reset-invoices.ts --confirm`. `tsx` isn't a dependency, so `npx` downloads it on first run. `DIRECT_URL`/the IPv6 note below only matters for migrations, not the reset.
- **Profile / change-password page — dropped** (2026-11-13). Password changes still go through an admin-generated reset link on the Team page. `/settings` remains an admin-only placeholder.

> **Local DB note (Linux machine):** the Supabase direct host is IPv6-only. On a machine without IPv6, set `DIRECT_URL` in `.env.local` to the session pooler (same host as `DATABASE_URL`, port **5432**) — otherwise local dev fails with `ENETUNREACH`.

## Commands

```bash
npm run dev       # start dev server (Next.js 16, Turbopack)
npm run build     # production build
npm run lint      # ESLint
npx tsc --noEmit  # type-check without emitting

# Prisma
npx prisma generate                      # regenerate client after schema changes
npx prisma migrate dev --name <name>     # create and apply a new migration
npx prisma studio                        # open Prisma Studio (DB browser)

# Tests (Node built-in runner, no extra deps)
npx tsx --test src/lib/invoice-math.test.ts

# One-off: wipe ALL invoices/items/payments and reset numbering to INV-0001
npx tsx scripts/reset-invoices.ts            # dry run (counts only)
npx tsx scripts/reset-invoices.ts --confirm  # actually delete — production DB!
```

> Migrations use `DIRECT_URL` (bypasses pgBouncer). Runtime queries use `DATABASE_URL` (pooled). Both are in `.env.local`.

## Architecture

**Stack:** Next.js 16 App Router · React 19 · Prisma 7 · Supabase Auth · PostgreSQL (Supabase) · Tailwind v4 · Base UI

### Auth flow

Two layers work together:
1. `src/proxy.ts` — Next.js 16 middleware (the file is named `proxy.ts`, not `middleware.ts`). Refreshes the Supabase session cookie on every request; redirects unauthenticated users to `/login` and authenticated users away from auth routes. Public auth routes (bypassed regardless of session): `/auth/callback`, `/auth/confirm`, `/update-password`, `/invite`.
2. `src/(dashboard)/layout.tsx` — Server Component that re-validates the session AND checks the Prisma `users` table for `isActive`. If the DB user is missing or inactive, it signs out and redirects.

Users are stored in **both** Supabase Auth (`auth.users`) and our Prisma `users` table. A Supabase trigger is expected to mirror `auth.users` inserts into the `users` table. The Supabase user `id` is the primary key in the `users` table.

#### Auth callback routes

- `src/app/auth/callback/page.tsx` — handles Supabase redirects after token verification (implicit hash, PKCE code, and token_hash flows). Routes `type=recovery` and `type=invite` to `/update-password`.
- `src/app/auth/confirm/page.tsx` — same logic as callback; handles the token_hash OTP format used by the "Reset Password" email template.
- `src/app/page.tsx` — client component that intercepts hash-based recovery/invite tokens before redirecting to `/dashboard`.

#### Link preview protection

WhatsApp and other messaging apps prefetch URLs in emails, which would consume Supabase one-time tokens. Two mitigations are in place:

- **Invite links**: wrapped in `${SITE_URL}/invite?link=<encoded-supabase-url>`. The bot sees a static landing page; only an explicit button click navigates to the Supabase URL.
- **Password reset links**: the Supabase "Reset Password" email template uses `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` instead of `{{ .ConfirmationURL }}`. The bot fetches our page but cannot execute JavaScript, so `verifyOtp` is never called and the token stays valid.

> If you ever regenerate or reset the Supabase email template, restore it to use the token_hash format above — reverting to `{{ .ConfirmationURL }}` will break password reset for users on WhatsApp.

### Database / Prisma 7

- Generator: `prisma-client` (not the legacy `prisma-client-js`). Generated output lands in `src/generated/prisma/`.
- **All generated files have `@ts-nocheck`** — this is expected in Prisma 7. Types still flow through correctly because the interfaces are declared, not inferred.
- Import the client from `@/generated/prisma/client` (not `@/generated/prisma` — there is no `index.ts`).
- Runtime uses `PrismaPg` driver adapter for pgBouncer compatibility (`src/lib/prisma.ts`).
- `prisma.config.ts` loads `.env.local` via dotenv so the CLI picks up Next.js env vars.
- `InvoiceCounter` (always one row, `id=1`) is used for atomic sequential invoice numbering.

### UI components

This project uses **`@base-ui/react`** for interactive primitives (Dialog, Select, DropdownMenu, Button, etc.), **not Radix UI's `asChild` pattern**. Key difference:

- ❌ `<Button asChild><Link href="...">` — does not work, `asChild` is not a prop
- ✅ `<Button render={<Link href="..." />}>` — Base UI's polymorphic rendering
- ✅ `<DialogTrigger render={<Button />}>` — same for any Base UI trigger

Shadcn-style component wrappers live in `src/components/ui/`. Do not add new `asChild` usages.

#### Base UI `Select` — required `items` and `label` props

Every `<Select>` root **must** receive `items` (array of `{ value, label }` objects) and every `<SelectItem>` **must** receive a `label` prop matching its display text. Base UI uses these for keyboard type-ahead and value display:

```tsx
<Select value={v} onValueChange={...} items={options.map(o => ({ value: o.id, label: o.name }))}>
  <SelectItem value={o.id} label={o.name}>{o.name}</SelectItem>
```

#### `SearchableSelect` — for long lists

Use `src/components/ui/searchable-select.tsx` instead of the plain `Select` when a dropdown contains many items (e.g. customers, products). It renders a full-width trigger button and, on click, replaces it with a live-filter search input. Escape or click-outside closes it.

```tsx
<SearchableSelect
  value={selectedId}
  onValueChange={(id) => setSelectedId(id)}
  options={items.map(i => ({ value: i.id, label: i.name }))}
  placeholder="Select…"
  searchPlaceholder="Search…"
/>
```

It is a pure client component with no external dependencies — no Base UI Combobox, no portals.

### Dates and money

The business is in **New York**; Vercel renders in UTC. Never call `toLocaleDateString` directly — use `src/lib/dates.ts`:
- `formatDate(d)` — moments in time (`createdAt`, `paidAt`), shown in New York time.
- `formatCalendarDate(d)` — values from a date picker (`dueDate`, expense `date`). They're stored as midnight UTC, so they're read in UTC; New York time would show the previous day.
- `businessYear(d)` — New York year (used for the yearly invoice grouping).

Money: `formatMoney(n)` in `src/lib/invoice-math.ts` (`-$50.00`, not `$-50.00`).

### Server Actions

All mutations go through `"use server"` files in `src/app/actions/`. Every action calls `getAuthUser()` first (re-validates the Supabase session) before touching the database. After mutations, call `revalidatePath()` to invalidate the relevant page cache.

### Data flow pattern

Pages are **async Server Components** that call `prisma.*` directly — no API routes for CRUD. Interactive dialogs are Client Components that call server actions. Toast feedback uses `sonner`.

```
Server Component (page)  →  fetches data via prisma
Client Component (dialog) → calls server action → revalidatePath → Server Component re-renders
```

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled connection (pgBouncer, port 6543) — used at runtime |
| `DIRECT_URL` | Direct connection (port 5432) — used only for Prisma migrations |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) |

> `NEXT_PUBLIC_*` vars are inlined **at build time**. Changing them in Vercel requires a **redeploy** to take effect — updating them alone does nothing to the already-built client bundle.

## Troubleshooting

### Login fails with "Failed to fetch" (no HTTP status)

Symptom: the login page shows `Failed to fetch` and the Network tab is full of `(failed) net::…` entries on `POST /auth/v1/token?grant_type=refresh_token`. These are **network-level** failures (the request never reaches Supabase), *not* auth errors — a wrong password returns an HTTP `400` with a JSON body instead.

Most common cause: the **Supabase project is paused**. Free-tier projects auto-pause after ~1 week of inactivity, and a paused (or deleted) project's subdomain stops resolving in DNS.

Diagnose from the shell:

```bash
# Pull the project host and confirm whether it resolves.
URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '\r"')
nslookup "${URL#https://}"            # NXDOMAIN ⇒ project paused/deleted
curl -s -o /dev/null -w 'HTTP %{http_code}\n' "$URL/auth/v1/health"  # exit 6 ⇒ host unreachable
```

If the host returns **NXDOMAIN**, restore the project from the [Supabase dashboard](https://supabase.com/dashboard) (Restore/Resume). Wait a couple of minutes for DNS to propagate, then re-run the `curl` health check before retrying login.

> **Permanent fix:** free-tier projects auto-pause after ~1 week idle; **Pro-plan orgs never auto-pause.** Billing is per *organization* in Supabase, so either upgrade the org holding this project to Pro, or transfer the project into an existing Pro org (Project → Settings → General → Transfer project). The project ref/URL/keys are unchanged either way, so no code or Vercel env changes are needed. The project must be restored (not paused) before it can be transferred.

If the host **does** resolve but requests still fail, check the browser Console for the exact `net::ERR_*` code (CORS, blocked by extension, etc.) and verify the Vercel env vars match `.env.local`, then redeploy.
