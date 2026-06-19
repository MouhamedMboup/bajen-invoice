import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Download, EyeOff, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoiceStatusSelect, DeleteInvoiceButton } from "@/components/invoices/invoice-actions";
import { AddPaymentDialog } from "@/components/invoices/add-payment-dialog";

export const metadata: Metadata = { title: "Invoice — Bajen Invoice" };

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CHECK: "Check",
  BANK_TRANSFER: "Bank Transfer",
  CREDIT_CARD: "Credit Card",
  OTHER: "Other",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true } },
      payments: { orderBy: { paidAt: "desc" } },
      createdBy: { select: { fullName: true } },
    },
  });

  if (!invoice) notFound();

  const totalPaid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
  const balance = Number(invoice.total) - totalPaid;
  const isPaid = balance <= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">{invoice.invoiceNumber}</h2>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-muted-foreground">
            {invoice.customer.companyName}
            {invoice.customer.contactName ? ` · ${invoice.customer.contactName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            render={<Link href={`/invoices/${invoice.id}/edit`} />}
            variant="outline"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            render={<Link href={`/api/invoices/${invoice.id}/pdf`} target="_blank" />}
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button
            render={<Link href={`/api/invoices/${invoice.id}/pdf?hideFinancials=1`} target="_blank" />}
            variant="outline"
          >
            <EyeOff className="mr-2 h-4 w-4" />
            No Financials
          </Button>
          <InvoiceStatusSelect invoiceId={invoice.id} status={invoice.status} />
          {!isPaid && <AddPaymentDialog invoiceId={invoice.id} balance={balance} />}
          <DeleteInvoiceButton invoiceId={invoice.id} />
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 rounded-lg border bg-card p-4 text-sm">
        <div>
          <p className="text-muted-foreground">Created</p>
          <p className="font-medium">
            {new Date(invoice.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Due Date</p>
          <p className="font-medium">
            {invoice.dueDate
              ? new Date(invoice.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Created By</p>
          <p className="font-medium">{invoice.createdBy.fullName}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Balance Due</p>
          <p className={`font-bold text-base ${balance > 0 ? "text-destructive" : "text-green-600"}`}>
            ${balance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Line items */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.productName}</TableCell>
                <TableCell className="text-muted-foreground">{item.productSku ?? "—"}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">${Number(item.unitPrice).toFixed(2)}</TableCell>
                <TableCell className="text-right">${Number(item.discount).toFixed(2)}</TableCell>
                <TableCell className="text-right font-medium">
                  ${Number(item.total).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Totals + notes */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {invoice.notes && (
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-medium mb-1">Notes</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        <div className="rounded-lg border bg-card p-4 space-y-2 text-sm lg:ml-auto lg:w-72">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          {Number(invoice.taxRate) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({Number(invoice.taxRate)}%)</span>
              <span>${Number(invoice.taxAmount).toFixed(2)}</span>
            </div>
          )}
          {Number(invoice.discountAmount) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>-${Number(invoice.discountAmount).toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold text-base">
            <span>Total</span>
            <span>${Number(invoice.total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Total Paid</span>
            <span>${totalPaid.toFixed(2)}</span>
          </div>
          <Separator />
          <div className={`flex justify-between font-bold ${balance > 0 ? "text-destructive" : "text-green-600"}`}>
            <span>Balance Due</span>
            <span>${balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payments */}
      {invoice.payments.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Payment History</h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {new Date(p.paidAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>{PAYMENT_METHOD_LABELS[p.method]}</TableCell>
                    <TableCell>{p.notes ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${Number(p.amount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
