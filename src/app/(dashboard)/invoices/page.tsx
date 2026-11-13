import type { Metadata } from "next";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { InvoiceTable, YearHeader } from "@/components/invoices/invoice-table";
import { groupByYear, outstanding } from "@/lib/invoice-math";

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
        groupByYear(invoices).map((group) => (
          <section key={group.year} className="space-y-2">
            <YearHeader year={group.year} amount={outstanding(group.invoices)} />
            <div className="rounded-lg border">
              <InvoiceTable showCustomer invoices={group.invoices} />
            </div>
          </section>
        ))
      )}
    </div>
  );
}
