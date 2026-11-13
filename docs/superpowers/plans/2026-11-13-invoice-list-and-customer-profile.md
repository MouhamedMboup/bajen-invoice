# Invoice List, Customer Profile & Numbering Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add delete-from-list, year grouping with outstanding totals on `/invoices`, a `/customers/[id]` profile page, and a one-off script that resets invoice numbering to `INV-0001`.

**Architecture:** Pure money/grouping helpers in `src/lib/invoice-math.ts` feed a shared server `InvoiceTable` component used by both `/invoices` and the customer profile. Deletion goes through one Dialog-based client `DeleteInvoiceButton`; the `deleteInvoice` server action stops redirecting and the caller navigates. The reset is a standalone `tsx` script.

**Tech Stack:** Next.js 16 App Router (async `params: Promise<…>`), React 19, Prisma 7 (`@/generated/prisma/client`), Base UI wrappers in `src/components/ui/`, Tailwind v4, sonner, lucide-react. Tests: Node's built-in `node:test` run via `npx tsx --test` (no new dependency).

**Spec:** `docs/superpowers/specs/2026-11-13-invoice-list-and-customer-profile-design.md`

## Global Constraints

- No Prisma schema changes. No new dependencies in `package.json` (`tsx` is run via `npx` only).
- Base UI polymorphism: `render={<Link href="…" />}`, never `asChild`.
- Every server action calls `getAuthUser()` first.
- `DRAFT` invoices **are included** in all totals (Outstanding, Total billed).
- Outstanding = sum of `max(total − paid, 0)` per invoice.
- Year = `createdAt.getUTCFullYear()`; years sorted newest first; within a year keep incoming order (`createdAt desc`).
- Money display: `$` + `toFixed(2)`; dates: `toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })` (existing convention).
- Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md` before writing the dynamic route.
- Local dev hits the **production** DB. Do browser testing before the reset; run the reset with `--confirm` only after the user says go.

## Review Focus

1. Invoice with **no payments** → paid `$0.00`, balance = total; included in Outstanding.
2. **Overpaid** invoice (paid > total) → its row shows negative balance, but it contributes `0` to Outstanding (doesn't offset other invoices).
3. Invoice created **Dec 31 late evening US time** → grouped under the UTC year (the next year), consistent with the server-rendered Created date.
4. **Customer with zero invoices** → profile renders tiles of `0`/`$0.00`, "No invoices yet.", "No payments recorded." — no crash.
5. **Delete fails** (e.g. network/auth) → error toast, dialog stays open, row stays; nonexistent `/customers/<bad-id>` → 404 page.

Items 1–3 are pinned by Task 1 tests; 4–5 by Task 3/4 manual checks.

---

### Task 1: Money & grouping helpers

**Files:**
- Create: `src/lib/invoice-math.ts`
- Create: `src/lib/invoice-math.test.ts`
- Modify: `src/app/(dashboard)/invoices/[id]/page.tsx:22-28` (move `PAYMENT_METHOD_LABELS` out)

**Interfaces:**
- Produces:
  - `type MoneyInvoice = { total: number | { toString(): string }; createdAt: Date; payments: { amount: number | { toString(): string } }[] }` (accepts Prisma `Decimal`)
  - `invoicePaid(inv: MoneyInvoice): number`
  - `invoiceBalance(inv: MoneyInvoice): number`
  - `outstanding(invs: MoneyInvoice[]): number`
  - `groupByYear<T extends MoneyInvoice>(invs: T[]): { year: number; invoices: T[] }[]`
  - `PAYMENT_METHOD_LABELS: Record<string, string>` (moved verbatim from the detail page)

- [ ] **Step 1: Write failing tests** in `src/lib/invoice-math.test.ts` using `node:test` + `node:assert/strict`:

```ts
const inv = (total: number, paid: number[], iso = "2026-03-01T12:00:00Z") =>
  ({ total, createdAt: new Date(iso), payments: paid.map((amount) => ({ amount })) });

test("no payments: paid 0, balance = total", () => {
  assert.equal(invoicePaid(inv(100, [])), 0);
  assert.equal(invoiceBalance(inv(100, [])), 100);
});
test("partial payments summed", () => assert.equal(invoiceBalance(inv(100, [30, 20.5])), 49.5));
test("overpaid contributes 0 to outstanding", () =>
  assert.equal(outstanding([inv(100, [150]), inv(80, [])]), 80));
test("decimal-like values accepted", () =>
  assert.equal(invoiceBalance({ total: { toString: () => "10.10" }, createdAt: new Date(), payments: [{ amount: { toString: () => "0.10" } }] }), 10));
test("groupByYear: newest year first, order kept, UTC year", () => {
  const a = inv(1, [], "2027-01-01T03:00:00Z"); // Dec 31 evening in US time
  const b = inv(2, [], "2026-06-01T00:00:00Z");
  const c = inv(3, [], "2026-02-01T00:00:00Z");
  const g = groupByYear([a, b, c]);
  assert.deepEqual(g.map((x) => x.year), [2027, 2026]);
  assert.deepEqual(g[1].invoices, [b, c]);
});
test("groupByYear: empty input", () => assert.deepEqual(groupByYear([]), []));
```

- [ ] **Step 2: Run** `npx tsx --test src/lib/invoice-math.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 3: Implement** the Produces list in `src/lib/invoice-math.ts`. Convert with `Number(x.toString())`. Round results to cents (`Math.round(n * 100) / 100`) to avoid float noise like `49.50000001`. Move `PAYMENT_METHOD_LABELS` here and import it in the detail page.

- [ ] **Step 4: Run** `npx tsx --test src/lib/invoice-math.test.ts` — Expected: all pass. Then `npx tsc --noEmit` — no errors.

- [ ] **Step 5: Commit** `feat: add invoice money and year-grouping helpers`

---

### Task 2: Dialog-based delete + non-redirecting action

**Files:**
- Modify: `src/app/actions/invoices.ts:183-188` (`deleteInvoice`)
- Create: `src/components/invoices/delete-invoice-button.tsx`
- Modify: `src/components/invoices/invoice-actions.tsx` (remove old `DeleteInvoiceButton` and now-unused imports)
- Modify: `src/app/(dashboard)/invoices/[id]/page.tsx:17,91`

**Interfaces:**
- Produces:
  - `deleteInvoice(id: string): Promise<void>` — `getAuthUser()`; read `customerId` (`findUnique`, select `customerId`); delete; `revalidatePath` for `/invoices`, `/dashboard`, `/customers`, `/customers/${customerId}`; **no redirect**.
  - `DeleteInvoiceButton({ invoiceId, invoiceNumber, redirectTo, variant }: { invoiceId: string; invoiceNumber: string; redirectTo?: string; variant?: "icon" | "button" })` — `"use client"`, default `variant="icon"`.

- [ ] **Step 1: Update `deleteInvoice`** per the Produces line; remove the `redirect` import only if nothing else in the file uses it.

- [ ] **Step 2: Create `DeleteInvoiceButton`**, following `src/components/customers/delete-customer-button.tsx`:
  - `variant="icon"`: ghost icon button `h-8 w-8 text-destructive hover:text-destructive`, `<Trash2 className="h-4 w-4" />`, `aria-label={`Delete invoice ${invoiceNumber}`}`.
  - `variant="button"`: the current detail-page look (outline, destructive text, `Trash2` + "Delete").
  - Dialog copy (exact): title `Delete Invoice`; description `Delete invoice <strong>{invoiceNumber}</strong>? Its items and payments will be deleted too. This cannot be undone.`; buttons `Cancel` / `Delete` (`Deleting…` while pending).
  - Success: `toast.success("Invoice deleted")`, close, then `router.push(redirectTo)` if set (`useRouter` from `next/navigation`). Error: `toast.error("Failed to delete invoice")`, dialog stays open.

- [ ] **Step 3: Wire the detail page:** import from the new file; render `<DeleteInvoiceButton invoiceId={invoice.id} invoiceNumber={invoice.invoiceNumber} redirectTo="/invoices" variant="button" />`.

- [ ] **Step 4: Verify** `npx tsc --noEmit && npm run lint` — clean. `grep -rn "confirm(" src/components/invoices` — no matches.

- [ ] **Step 5: Commit** `feat: dialog-based invoice delete; action no longer redirects`

---

### Task 3: Shared InvoiceTable + yearly `/invoices` with list delete

**Files:**
- Create: `src/components/invoices/invoice-table.tsx`
- Modify: `src/app/(dashboard)/invoices/page.tsx`

**Interfaces:**
- Consumes: `invoicePaid`, `invoiceBalance`, `outstanding`, `groupByYear` (Task 1); `DeleteInvoiceButton` (Task 2).
- Produces:
  - `InvoiceTable({ invoices, showCustomer }: { invoices: TableInvoice[]; showCustomer: boolean })` — server component (no `"use client"`).
  - `type TableInvoice = MoneyInvoice & { id: string; invoiceNumber: string; status: InvoiceStatus; dueDate: Date | null; customer?: { companyName: string } }` (`InvoiceStatus` from `@/generated/prisma/client`).
  - `YearHeader({ year, amount }: { year: number; amount: number })` — exported from the same file.

- [ ] **Step 1: Build `InvoiceTable`** by moving the existing table markup out of `invoices/page.tsx` unchanged, except: the Customer column renders only when `showCustomer`; paid/balance come from Task 1 helpers; the last cell is `<div className="flex items-center gap-1">[pencil][<DeleteInvoiceButton invoiceId invoiceNumber />]</div>`.

- [ ] **Step 2: Build `YearHeader`:** `flex items-baseline justify-between`; left `<h3>` with the year (`text-lg font-semibold`); right `Outstanding: $X.XX` — `text-destructive font-medium` when `amount > 0`, else `text-muted-foreground`.

- [ ] **Step 3: Update `/invoices`:** keep the query and empty state; otherwise render, per `groupByYear(invoices)`, a `<section className="space-y-2">` containing `YearHeader` (amount = `outstanding(group.invoices)`) and `<div className="rounded-lg border"><InvoiceTable showCustomer invoices={group.invoices} /></div>`.

- [ ] **Step 4: Verify** `npx tsc --noEmit && npm run lint` clean. `npm run dev`, open `/invoices` (sign in yourself in the browser): year header(s) show with correct outstanding; pencil + trash on each row; trash → dialog → Cancel leaves row; Delete removes row, toast shown, URL still `/invoices`. Detail-page delete lands on `/invoices`.

- [ ] **Step 5: Commit** `feat: group invoices by year with outstanding totals; delete from list`

---

### Task 4: Customer profile page + link from list

**Files:**
- Create: `src/app/(dashboard)/customers/[id]/page.tsx`
- Modify: `src/app/(dashboard)/customers/page.tsx` (company name cell)

**Interfaces:**
- Consumes: `invoicePaid`, `outstanding`, `groupByYear`, `PAYMENT_METHOD_LABELS` (Task 1); `InvoiceTable`, `YearHeader` (Task 3).
- Produces: route `/customers/[id]`.

- [ ] **Step 1: Page scaffold:** `params: Promise<{ id: string }>`, `await params`; query per spec §3 (`include: { invoices: { orderBy: { createdAt: "desc" }, include: { payments: { orderBy: { paidAt: "desc" } } } } }`); `notFound()` if null. `generateMetadata` → `` `${companyName} — Bajen Invoice` `` (also `notFound()`-safe).

- [ ] **Step 2: Header + contact card:** `← Customers` link to `/customers`; `<h2>` company name + Active/Inactive `Badge` (same variants as list). Card fields in order: Contact, Phone, Email, Billing address, Shipping address, Notes; null → `—`; addresses/notes `whitespace-pre-line`.

- [ ] **Step 3: Stat tiles** (`grid gap-4 sm:grid-cols-2 lg:grid-cols-4`, each `rounded-lg border bg-card p-4`): `Invoices` = count; `Total billed` = Σ`Number(total)`; `Total paid` = Σ`invoicePaid`; `Outstanding` = `outstanding(invoices)`, `text-destructive` when > 0.

- [ ] **Step 4: Invoices section** `<h3>Invoices</h3>`; empty → `No invoices yet.`; else per year: `YearHeader` + `InvoiceTable showCustomer={false}`.

- [ ] **Step 5: Payment history** `<h3>Payment history</h3>`: flatten `invoices.flatMap(i => i.payments.map(p => ({ ...p, invoiceId: i.id, invoiceNumber: i.invoiceNumber })))`, sort by `paidAt` desc. Columns: Date · Invoice # (Link `/invoices/[id]`) · Method (`PAYMENT_METHOD_LABELS[method] ?? method`) · Amount (right-aligned) · Notes (`—` if null). Empty → `No payments recorded.`

- [ ] **Step 6: Link from list:** company cell → `<Link href={`/customers/${c.id}`} className="font-medium hover:underline">`.

- [ ] **Step 7: Verify** `npx tsc --noEmit && npm run lint` clean. In browser: click a company → profile; tiles match the sum of that customer's rows on `/invoices`; invoice and payment links work; a customer with zero invoices renders empty states; `/customers/00000000-0000-0000-0000-000000000000` → 404.

- [ ] **Step 8: Commit** `feat: customer profile page with stats, invoices by year, payment history`

---

### Task 5: Numbering reset script

**Files:**
- Create: `scripts/reset-invoices.ts`
- Modify: `CLAUDE.md` (Commands block: add the script; Current status: mark features done)

**Interfaces:**
- Consumes: `prisma` from `src/lib/prisma` via **dynamic import** after `config({ path: ".env.local", quiet: true })` from `dotenv`.

- [ ] **Step 1: Write the script:**
  - Parse `const confirm = process.argv.includes("--confirm")`.
  - Always print counts: invoices, invoice items, payments, and current `nextNumber`.
  - No `--confirm`: print `Dry run — nothing deleted. Re-run with --confirm to wipe all invoices and reset numbering.` and exit 0.
  - `--confirm`: `prisma.$transaction([payment.deleteMany(), invoiceItem.deleteMany(), invoice.deleteMany(), invoiceCounter.upsert({ where: { id: 1 }, create: { id: 1, nextNumber: 1 }, update: { nextNumber: 1 } })])`; print deleted counts and `Next invoice will be INV-0001.`
  - Always `prisma.$disconnect()`; on error print the message and `process.exit(1)`.

- [ ] **Step 2: Dry run** `npx tsx scripts/reset-invoices.ts` — Expected: counts printed, "Dry run — nothing deleted", and a re-run of the read-only counts unchanged.

- [ ] **Step 3: Update CLAUDE.md:** add `npx tsx scripts/reset-invoices.ts [--confirm]  # wipe all invoices & reset numbering (dry run without flag)` to Commands; update the status section to say the four features are implemented and the reset is pending/complete.

- [ ] **Step 4: Commit** `feat: add guarded invoice reset script`

- [ ] **Step 5: (Gated — ask the user first)** `npx tsx scripts/reset-invoices.ts --confirm`, then create one invoice in the browser and verify it is `INV-0001`.
