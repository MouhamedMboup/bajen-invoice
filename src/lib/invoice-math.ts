// Pure money and grouping helpers shared by the invoice list and customer profile.
// Accepts Prisma Decimal values (anything with toString) as well as plain numbers.

type Numeric = number | { toString(): string };

export type MoneyInvoice = {
  total: Numeric;
  createdAt: Date;
  payments: { amount: Numeric }[];
};

const toNumber = (v: Numeric) => (typeof v === "number" ? v : Number(v.toString()));
const cents = (n: number) => Math.round(n * 100) / 100;

export function invoicePaid(inv: MoneyInvoice): number {
  return cents(inv.payments.reduce((sum, p) => sum + toNumber(p.amount), 0));
}

export function invoiceBalance(inv: MoneyInvoice): number {
  return cents(toNumber(inv.total) - invoicePaid(inv));
}

/** Sum of what is still owed. Overpaid invoices count as 0, never negative. */
export function outstanding(invs: MoneyInvoice[]): number {
  return cents(invs.reduce((sum, inv) => sum + Math.max(invoiceBalance(inv), 0), 0));
}

/** Groups by UTC year of createdAt, newest year first, preserving input order within a year. */
export function groupByYear<T extends MoneyInvoice>(invs: T[]): { year: number; invoices: T[] }[] {
  const groups = new Map<number, T[]>();
  for (const inv of invs) {
    const year = inv.createdAt.getUTCFullYear();
    const list = groups.get(year);
    if (list) list.push(inv);
    else groups.set(year, [inv]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, invoices]) => ({ year, invoices }));
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CHECK: "Check",
  BANK_TRANSFER: "Bank Transfer",
  CREDIT_CARD: "Credit Card",
  OTHER: "Other",
};
