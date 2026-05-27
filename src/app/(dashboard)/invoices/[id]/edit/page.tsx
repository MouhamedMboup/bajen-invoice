import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { EditInvoiceForm } from "@/components/invoices/edit-invoice-form";

export const metadata: Metadata = { title: "Edit Invoice — Bajen Invoice" };

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [invoice, customers, products] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    }),
    prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { companyName: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!invoice) notFound();

  const initialDueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toISOString().split("T")[0]
    : "";

  const initialItems = invoice.items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    productSku: item.productSku,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    discount: Number(item.discount),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Edit {invoice.invoiceNumber}</h2>
        <p className="text-muted-foreground">Update invoice details and line items.</p>
      </div>
      <EditInvoiceForm
        invoiceId={invoice.id}
        initialCustomerId={invoice.customerId}
        initialDueDate={initialDueDate}
        initialTaxRate={Number(invoice.taxRate)}
        initialDiscountAmount={Number(invoice.discountAmount)}
        initialNotes={invoice.notes ?? ""}
        initialItems={initialItems}
        customers={customers}
        products={products}
      />
    </div>
  );
}
