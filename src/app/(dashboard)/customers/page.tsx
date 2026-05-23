import type { Metadata } from "next";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Customers — Bajen Invoice" };

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">Manage your customer database.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">No customers yet.</p>
      </div>
    </div>
  );
}
