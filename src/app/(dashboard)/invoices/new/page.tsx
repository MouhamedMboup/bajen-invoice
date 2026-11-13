import type { Metadata } from "next";
import { getInvoiceFormOptions } from "@/lib/invoice-form-options";
import { NewInvoiceForm } from "@/components/invoices/new-invoice-form";

export const metadata: Metadata = { title: "New Invoice — Bajen Invoice" };

export default async function NewInvoicePage() {
  const { customers, products } = await getInvoiceFormOptions();

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
