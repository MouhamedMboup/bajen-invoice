import type { Metadata } from "next";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Products — Bajen Invoice" };

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Products & Inventory</h2>
          <p className="text-muted-foreground">Manage your product catalog and stock levels.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">No products yet.</p>
      </div>
    </div>
  );
}
