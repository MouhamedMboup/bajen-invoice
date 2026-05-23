import type { Metadata } from "next";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Invoices — Bajen Invoice" };

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Invoices</h2>
          <p className="text-muted-foreground">Manage and track all invoices.</p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Invoice
          </Link>
        </Button>
      </div>
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">No invoices yet. Create your first one.</p>
      </div>
    </div>
  );
}
