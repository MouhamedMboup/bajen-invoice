import Link from "next/link";
import { Pencil } from "lucide-react";
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
import { DeleteInvoiceButton } from "@/components/invoices/delete-invoice-button";
import { invoiceBalance, invoicePaid, type MoneyInvoice } from "@/lib/invoice-math";
import type { InvoiceStatus } from "@/generated/prisma/client";

export type TableInvoice = MoneyInvoice & {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  dueDate: Date | null;
  customer?: { companyName: string };
};

const formatDate = (d: Date) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function YearHeader({ year, amount }: { year: number; amount: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <h3 className="text-lg font-semibold">{year}</h3>
      <span className={amount > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
        Outstanding: ${amount.toFixed(2)}
      </span>
    </div>
  );
}

export function InvoiceTable({
  invoices,
  showCustomer,
}: {
  invoices: TableInvoice[];
  showCustomer: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          {showCustomer && <TableHead>Customer</TableHead>}
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead className="text-right">Paid</TableHead>
          <TableHead className="text-right">Balance</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Created</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => {
          const paid = invoicePaid(inv);
          const balance = invoiceBalance(inv);
          return (
            <TableRow key={inv.id} className="cursor-pointer">
              <TableCell>
                <Link href={`/invoices/${inv.id}`} className="font-medium hover:underline">
                  {inv.invoiceNumber}
                </Link>
              </TableCell>
              {showCustomer && <TableCell>{inv.customer?.companyName ?? "—"}</TableCell>}
              <TableCell>
                <InvoiceStatusBadge status={inv.status} />
              </TableCell>
              <TableCell className="text-right">${Number(inv.total.toString()).toFixed(2)}</TableCell>
              <TableCell className="text-right">${paid.toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <span className={balance > 0 ? "text-destructive font-medium" : ""}>
                  ${balance.toFixed(2)}
                </span>
              </TableCell>
              <TableCell>{inv.dueDate ? formatDate(inv.dueDate) : "—"}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(inv.createdAt)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    render={<Link href={`/invoices/${inv.id}/edit`} />}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Edit invoice ${inv.invoiceNumber}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <DeleteInvoiceButton invoiceId={inv.id} invoiceNumber={inv.invoiceNumber} />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
