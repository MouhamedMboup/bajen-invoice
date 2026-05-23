import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";

export const metadata: Metadata = { title: "Dashboard — Bajen Invoice" };

export default async function DashboardPage() {
  const [invoices, expenses, products, customerCount] = await Promise.all([
    prisma.invoice.findMany({
      include: { payments: { select: { amount: true } }, customer: { select: { companyName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.product.findMany({ select: { stockLevel: true, minStockAlert: true } }),
    prisma.customer.count({ where: { isActive: true } }),
  ]);

  const lowStockCount = products.filter((p) => p.stockLevel <= p.minStockAlert).length;

  const totalRevenue = invoices
    .filter((inv) => inv.status === "PAID" || inv.status === "PARTIAL")
    .reduce((sum, inv) => {
      const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
      return sum + paid;
    }, 0);

  const totalExpenses = Number(expenses._sum.amount ?? 0);
  const profit = totalRevenue - totalExpenses;

  const overdueCount = invoices.filter((inv) => inv.status === "OVERDUE").length;
  const unpaidCount = invoices.filter((inv) => inv.status === "UNPAID").length;

  const recent = invoices.slice(0, 5);

  const stats = [
    {
      label: "Total Revenue",
      value: `$${totalRevenue.toFixed(2)}`,
      sub: "From paid invoices",
    },
    {
      label: "Total Expenses",
      value: `$${totalExpenses.toFixed(2)}`,
      sub: "All recorded expenses",
    },
    {
      label: "Net Profit",
      value: `$${profit.toFixed(2)}`,
      sub: "Revenue minus expenses",
      highlight: profit >= 0 ? "text-green-600" : "text-destructive",
    },
    {
      label: "Overdue / Unpaid",
      value: `${overdueCount} / ${unpaidCount}`,
      sub: "Invoices needing attention",
      highlight: overdueCount > 0 ? "text-destructive" : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          {customerCount} active customer{customerCount !== 1 ? "s" : ""} · {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
            <p className={`mt-2 text-3xl font-bold ${stat.highlight ?? ""}`}>{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      {lowStockCount > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <strong>{lowStockCount} product{lowStockCount !== 1 ? "s" : ""}</strong> below minimum stock level.{" "}
          <Link href="/products" className="underline">
            View products
          </Link>
        </div>
      )}

      {recent.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Recent Invoices</h3>
          <div className="rounded-lg border divide-y">
            {recent.map((inv) => {
              const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
              const balance = Number(inv.total) - paid;
              return (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="font-medium hover:underline"
                    >
                      {inv.invoiceNumber}
                    </Link>
                    <span className="text-muted-foreground">{inv.customer.companyName}</span>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${Number(inv.total).toFixed(2)}</p>
                    {balance > 0 && (
                      <p className="text-xs text-destructive">Balance: ${balance.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {invoices.length > 5 && (
            <Link href="/invoices" className="text-sm text-muted-foreground hover:underline">
              View all {invoices.length} invoices →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
