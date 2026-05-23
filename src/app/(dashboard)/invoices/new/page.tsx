import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { NewInvoiceForm } from "@/components/invoices/new-invoice-form";

export const metadata: Metadata = { title: "New Invoice — Bajen Invoice" };

export default async function NewInvoicePage() {
  const [customers, products] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { companyName: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Invoice</h2>
        <p className="text-muted-foreground">Create a new invoice for a customer.</p>
      </div>
      <NewInvoiceForm customers={customers} products={products} />
    </div>
  );
}
