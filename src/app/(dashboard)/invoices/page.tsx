import type { Metadata } from "next";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";

export const metadata: Metadata = { title: "Invoices — Bajen Invoice" };

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { companyName: true } },
      payments: { select: { amount: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Manage and track all invoices.</p>
        </div>
        <Button render={<Link href="/invoices/new" />}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">No invoices yet. Create your first one.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
                const balance = Number(inv.total) - paid;
                return (
                  <TableRow key={inv.id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="font-medium hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{inv.customer.companyName}</TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={inv.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(inv.total).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">${paid.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <span className={balance > 0 ? "text-destructive font-medium" : ""}>
                        ${balance.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {inv.dueDate
                        ? new Date(inv.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
