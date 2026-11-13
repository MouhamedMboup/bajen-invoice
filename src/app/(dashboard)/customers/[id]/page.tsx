import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceTable, YearHeader } from "@/components/invoices/invoice-table";
import {
  groupByYear,
  invoicePaid,
  outstanding,
  PAYMENT_METHOD_LABELS,
} from "@/lib/invoice-math";

// Deduplicated between generateMetadata and the page within one request.
const getCustomer = cache((id: string) =>
  prisma.customer.findUnique({
    where: { id },
    include: {
      invoices: {
        orderBy: { createdAt: "desc" },
        include: { payments: { orderBy: { paidAt: "desc" } } },
      },
    },
  }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const customer = await getCustomer(id);
  return { title: customer ? `${customer.companyName} — Bajen Invoice` : "Customer — Bajen Invoice" };
}

const formatDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const { invoices } = customer;
  const totalBilled = invoices.reduce((s, i) => s + Number(i.total.toString()), 0);
  const totalPaid = invoices.reduce((s, i) => s + invoicePaid(i), 0);
  const owed = outstanding(invoices);

  const payments = invoices
    .flatMap((i) =>
      i.payments.map((p) => ({ ...p, invoiceId: i.id, invoiceNumber: i.invoiceNumber })),
    )
    .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime());

  const contact: [string, string | null][] = [
    ["Contact", customer.contactName],
    ["Phone", customer.phone],
    ["Email", customer.email],
    ["Billing address", customer.billingAddress],
    ["Shipping address", customer.shippingAddress],
    ["Notes", customer.notes],
  ];

  const stats: { label: string; value: string; danger?: boolean }[] = [
    { label: "Invoices", value: String(invoices.length) },
    { label: "Total billed", value: `$${totalBilled.toFixed(2)}` },
    { label: "Total paid", value: `$${totalPaid.toFixed(2)}` },
    { label: "Outstanding", value: `$${owed.toFixed(2)}`, danger: owed > 0 },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Customers
      </Link>

      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold tracking-tight">{customer.companyName}</h2>
        <Badge variant={customer.isActive ? "default" : "secondary"}>
          {customer.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contact.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="whitespace-pre-line">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.danger ? "text-destructive" : ""}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Invoices</h3>
        {invoices.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-muted-foreground">No invoices yet.</p>
          </div>
        ) : (
          groupByYear(invoices).map((group) => (
            <div key={group.year} className="space-y-2">
              <YearHeader year={group.year} amount={outstanding(group.invoices)} />
              <div className="rounded-lg border">
                <InvoiceTable showCustomer={false} invoices={group.invoices} />
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-xl font-semibold">Payment history</h3>
        {payments.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-muted-foreground">No payments recorded.</p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paidAt)}</TableCell>
                    <TableCell>
                      <Link href={`/invoices/${p.invoiceId}`} className="font-medium hover:underline">
                        {p.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</TableCell>
                    <TableCell className="text-right">
                      ${Number(p.amount.toString()).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
