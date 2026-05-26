# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

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
