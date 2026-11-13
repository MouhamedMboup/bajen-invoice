import { prisma } from "@/lib/prisma";
import type { InvoiceFormCustomer, InvoiceFormProduct } from "@/types";

/** Active customers and products for the new/edit invoice forms, as plain objects. */
export async function getInvoiceFormOptions(): Promise<{
  customers: InvoiceFormCustomer[];
  products: InvoiceFormProduct[];
}> {
  const [customers, products] = await Promise.all([
    prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { companyName: "asc" },
      select: { id: true, companyName: true },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, sku: true, wholesalePrice: true },
    }),
  ]);

  return {
    customers,
    products: products.map((p) => ({ ...p, wholesalePrice: Number(p.wholesalePrice) })),
  };
}
