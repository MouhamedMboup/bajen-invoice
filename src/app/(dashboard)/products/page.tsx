import type { Metadata } from "next";
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
import { ProductDialog, EditProductButton } from "@/components/products/product-dialog";
import { DeleteProductButton } from "@/components/products/delete-product-button";

export const metadata: Metadata = { title: "Products — Bajen Invoice" };

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      orderBy: { name: "asc" },
      include: { category: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products & Inventory</h2>
          <p className="text-muted-foreground">Manage your product catalog and stock levels.</p>
        </div>
        <ProductDialog categories={categories} />
      </div>

      {products.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <p className="text-muted-foreground">No products yet. Add your first one.</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Wholesale</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const lowStock = p.stockLevel <= p.minStockAlert;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                    <TableCell>{p.brand ?? "—"}</TableCell>
                    <TableCell>{p.category?.name ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      ${Number(p.unitPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(p.wholesalePrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">{p.stockLevel}</TableCell>
                    <TableCell>
                      <Badge variant={lowStock ? "destructive" : "default"}>
                        {lowStock ? "Low Stock" : "In Stock"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <EditProductButton product={p} categories={categories} />
                        <DeleteProductButton id={p.id} name={p.name} />
                      </div>
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
