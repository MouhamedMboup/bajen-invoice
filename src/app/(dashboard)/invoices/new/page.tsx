import type { Metadata } from "next";

export const metadata: Metadata = { title: "New Invoice — Bajen Invoice" };

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Invoice</h2>
        <p className="text-muted-foreground">Create a new invoice for a customer.</p>
      </div>
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">Invoice form coming soon.</p>
      </div>
    </div>
  );
}
