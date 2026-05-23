import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard — Bajen Invoice" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Welcome to Bajen Invoice.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["Total Revenue", "Total Expenses", "Profit", "Overdue Invoices"].map((label) => (
          <div key={label} className="rounded-lg border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold">—</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Analytics will appear here once data is available.
      </p>
    </div>
  );
}
