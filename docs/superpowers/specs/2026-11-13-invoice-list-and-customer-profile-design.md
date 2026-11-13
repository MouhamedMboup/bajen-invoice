# Invoice list improvements, customer profile, and numbering reset — design

**Date:** 2026-11-13
**Status:** Awaiting approval
**Scope guard:** no Prisma schema changes, no new dependencies. Everything is derived from existing data.

## Why

The app is moving from testing into real use for the client. The current invoice data is all test data. Before real invoices start, the client needs:

- numbering that starts clean at `INV-0001`;
- a quick way to remove invoices straight from the list;
- a per-customer view of what they've been billed, what they've paid, and what they owe;
- an invoice list that stays readable as the years go by, with each year's outstanding balance shown.

## Goals

1. Delete an invoice from the `/invoices` list, after a confirmation dialog.
2. A one-off script that wipes all invoices and payments and resets numbering, so the next invoice is `INV-0001`.
3. A customer profile page at `/customers/[id]`.
4. The `/invoices` list grouped by year, newest first, with each year's outstanding balance in its header.

## Non-goals

- Soft delete, an undo, or an audit trail for deletions.
- Restricting deletion to admins. Today any signed-in user can delete an invoice from its detail page; this keeps that rule.
- Filtering, search, or pagination on the invoice list.
- Editing customers from the profile page. Edit and delete stay on the customers list.
- A UI button for the reset. It's a script run once by the developer.

## Anti-goals

- The reset script must never run by accident. Running it without `--confirm` changes nothing.
- No invoice number may ever be issued twice. The reset clears **all** invoices, so no old number can collide with a new one.

## Current state (what this touches)

- `src/app/(dashboard)/invoices/page.tsx`: one flat table ordered by `createdAt desc`. Each row has the invoice number (links to the invoice), customer, status, total, paid, balance, due date, created date, and an edit pencil.
- `src/app/actions/invoices.ts` → `deleteInvoice(id)`: checks auth, deletes, calls `revalidatePath("/invoices")`, then **`redirect("/invoices")`**. Items and payments are removed by `onDelete: Cascade`.
- `src/components/invoices/invoice-actions.tsx` → `DeleteInvoiceButton` (on the invoice detail page) uses `confirm()` and depends on the action's redirect, swallowing the `NEXT_REDIRECT` error.
- `src/components/customers/delete-customer-button.tsx`: the Dialog-based confirmation pattern to copy.
- `src/app/(dashboard)/customers/page.tsx`: the company name is plain text.
- Numbering (`createInvoice`): upsert `InvoiceCounter` id=1, increment `nextNumber`, use `nextNumber - 1`. So `nextNumber = 1` makes the next invoice `INV-0001`.

## Approaches considered

**Delete from the list.**
- *A (picked):* one shared Dialog-based `DeleteInvoiceButton` used on both the list and the detail page. `deleteInvoice` stops redirecting; the caller decides what happens next (the list stays put, the detail page navigates to `/invoices`). One component, one confirmation style, and no more catching `NEXT_REDIRECT`.
- *B:* a separate list-only button plus a second `deleteInvoiceInPlace` action. That gives two near-identical actions and leaves the detail page on `confirm()`.
- *C:* a flag on the action (`deleteInvoice(id, { redirect })`). It works, but puts navigation back inside the action.

**Reset numbering.**
- *A (picked, already decided):* a standalone `scripts/reset-invoices.ts`, run with `npx tsx`, guarded by `--confirm`, with everything in one transaction.
- *B:* an admin-only button in Settings. Rejected: it's a one-time job, and a permanent "wipe everything" button is a risk.
- *C:* hand-written SQL in the Supabase SQL editor. Rejected: not repeatable and easy to get wrong.

**Customer profile data.**
- *A (picked):* one Prisma query in the Server Component (the customer, their invoices, and those invoices' payments), with totals computed in TypeScript the way `/invoices` already computes paid and balance.
- *B:* SQL aggregates (`groupBy`/`aggregate`). Faster at scale, but the data is small (dozens of invoices per customer) and it would duplicate the balance logic in a second form.

**Year grouping.**
- *A (picked):* group in the Server Component after the existing `findMany`; render one table per year under a header.
- *B:* a single table with year divider rows. Simpler markup, but it's harder to give each year a clear header with its own total.

## Design

### Shared money helpers (`src/lib/invoice-math.ts`, new)

Small pure functions, so the list, the profile, and the year headers all use the same arithmetic:

- `invoicePaid(inv)`: sum of `payments.amount`.
- `invoiceBalance(inv)`: `total − paid`.
- `outstanding(invs)`: sum of `max(balance, 0)`. Overpaid invoices don't reduce what other invoices still owe.
- `groupByYear(invs)`: `[{ year, invoices }]`, newest year first, keeping the incoming order (`createdAt desc`) within each year.
- Year = `createdAt.getUTCFullYear()`. *My call:* the "Created" column is rendered on the server, and Vercel runs in UTC, so the header year matches the date shown in the row.

Decimals are converted with `Number(...)`, as the existing pages do.

### 1. Delete from the invoice list

- **`deleteInvoice(id)`:** remove the `redirect`. Keep `getAuthUser()`. Revalidate `/invoices`, `/dashboard`, and `/customers` (the customers list shows invoice counts), plus `/customers/[customerId]` (read the invoice's `customerId` before deleting).
- **`DeleteInvoiceButton({ invoiceId, invoiceNumber, redirectTo? })`:** rewritten to the Dialog pattern from `delete-customer-button.tsx`:
  - a trash icon button (`ghost`, `icon`, destructive colour), with an `aria-label` of "Delete invoice INV-0007";
  - the dialog reads: "Delete invoice **INV-0007**? Its items and payments will be deleted too. This cannot be undone." It has Cancel and Delete buttons, and Delete shows "Deleting…" while pending;
  - on success: show a toast "Invoice deleted", close the dialog, and if `redirectTo` is set, `router.push(redirectTo)`;
  - on error: show a toast "Failed to delete invoice", and the dialog stays open.
- **The list:** the last cell becomes `[pencil][trash]` in a `flex gap-1`, matching the customers list.
- **The detail page:** uses the same component with `redirectTo="/invoices"`. *My call:* this replaces the `confirm()` dialog, so there's one confirmation style everywhere. The trigger keeps its current outlined "Delete" button look on the detail page, via a `variant` prop or by passing in the trigger.

### 2. Reset script (`scripts/reset-invoices.ts`, new)

- Load `.env.local` with `dotenv` (already installed, since `prisma.config.ts` uses it) **before** importing `src/lib/prisma` (use a dynamic import, because a static import runs first and reads empty env vars).
- **Without `--confirm`:** print the counts it *would* delete (invoices, items, payments) and the current `nextNumber`, then exit 0 without writing.
- **With `--confirm`:** in one `prisma.$transaction`, delete all `Payment`, then `InvoiceItem`, then `Invoice` rows, then `invoiceCounter.upsert({ id: 1 }, nextNumber: 1)`. Print what was deleted and confirm that the next invoice will be `INV-0001`.
- Run it with `npx tsx scripts/reset-invoices.ts [--confirm]`. `tsx` is fetched by `npx` and isn't added to `package.json`.
- It runs once, against the production database (the only database), **after** the features ship and after the user says go.

### 3. Customer profile (`src/app/(dashboard)/customers/[id]/page.tsx`, new)

- Read the `params` Promise according to the Next 16 docs in `node_modules/next/dist/docs/`. If the customer doesn't exist, `notFound()`.
- **Query:** `prisma.customer.findUnique({ where: { id }, include: { invoices: { orderBy: { createdAt: "desc" }, include: { payments: { orderBy: { paidAt: "desc" } } } } } })`.
- **Metadata:** `generateMetadata` gives the title "{companyName} — Bajen Invoice".
- **Layout, top to bottom:**
  - a "← Customers" back link; a header with the company name and an Active/Inactive badge.
  - **Contact card:** contact name, phone, email, billing address, shipping address, notes. Empty fields show "—".
  - **Four stat tiles:** Invoices (count) · Total billed (sum of `total`) · Total paid (sum of payments) · Outstanding (`outstanding()`, in the destructive colour when > 0).
  - **Invoices:** grouped by year with `groupByYear`, using the same columns as `/invoices` minus Customer. Each invoice number links to `/invoices/[id]`. Each year header shows that customer's outstanding balance for the year.
  - **Payment history:** every payment across this customer's invoices, newest first. Columns: Date (`paidAt`) · Invoice # (links to the invoice) · Method (readable label) · Amount · Notes.
  - Empty states: "No invoices yet." and "No payments recorded."
- **Customers list:** the company name becomes a `Link` to `/customers/[id]`, with `hover:underline` as on the invoices list.
- **Totals and drafts:** *my call:* drafts are included in all totals, matching how `/invoices` and the dashboard compute balances today. See open questions.

### 4. Yearly grouping on `/invoices`

- Keep the existing query, then `groupByYear(invoices)`.
- For each year, show a section header: **2026** on the left, and on the right "Outstanding: $X.XX" (destructive colour when > 0, otherwise muted "Outstanding: $0.00"), followed by that year's table with today's columns.
- The empty state for no invoices at all stays the same.
- *My call:* extract the table into `src/components/invoices/invoice-table.tsx` (a server component that takes `invoices` and a `showCustomer` flag), so `/invoices` and the customer profile render identical rows.

## Testing and verification

The repo has no test runner, and adding one would break the no-new-dependencies rule. Verification:

- `npx tsc --noEmit` and `npm run lint` pass.
- `invoice-math.ts` stays pure, so it's easy to check by reasoning, plus a throwaway `tsx` check during development (not committed).
- In the browser, against local dev:
  1. delete from the list: the dialog appears, Cancel does nothing, Delete removes the row and the page stays on `/invoices`;
  2. delete from the detail page: you land on `/invoices`;
  3. the customer profile shows correct tiles for a customer with partial payments, and the links work;
  4. the year headers are correct.
- Reset script: a dry run first (counts only), then `--confirm` after approval; then create one invoice and check that it's `INV-0001`.

## Open questions for approval

1. **Drafts in totals:** should `DRAFT` invoices count toward "Outstanding" and "Total billed"? The spec currently says **yes**, to match today's list and dashboard.

## Left to the builder

Exact Tailwind classes and spacing (follow the existing pages), the payment-method label mapping, and how the detail-page trigger variant is passed in.
